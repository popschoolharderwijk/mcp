-- BEGIN PURE TARIFF FUNCTIONS
-- Pure fee rules (no table access). Single source of truth for lesson fees;
-- tests/code/billing/lessonFeeRules.test.ts loads this block into PGlite.
CREATE OR REPLACE FUNCTION public.compute_minimum_term_end(p_start_date date)
RETURNS date LANGUAGE sql IMMUTABLE SET search_path = public
AS $$ SELECT (p_start_date + interval '6 months' - interval '1 day')::date $$;

CREATE OR REPLACE FUNCTION public.compute_cancellation_effective_date(
  p_minimum_term_end date, p_requested_on date, p_notice_days integer)
RETURNS date LANGUAGE plpgsql IMMUTABLE SET search_path = public
AS $$
DECLARE
  v_earliest date := p_requested_on + GREATEST(COALESCE(p_notice_days, 0), 0);
  v_end date;
BEGIN
  IF v_earliest <= p_minimum_term_end THEN
    RETURN p_minimum_term_end;
  END IF;
  -- After the minimum term the agreement renews per school year (ends 31 July).
  v_end := make_date(extract(year FROM p_minimum_term_end)::int, 7, 31);
  IF v_end <= p_minimum_term_end THEN
    v_end := (v_end + interval '1 year')::date;
  END IF;
  WHILE v_end < v_earliest LOOP
    v_end := (v_end + interval '1 year')::date;
  END LOOP;
  RETURN v_end;
END;
$$;

-- p_tariffs: jsonb array of {effective_from, amount_under_21_cents, amount_adult_cents}.
-- Returns one row. age_category is 'under_21' | '21_plus' (NULL when amount is 0).
CREATE OR REPLACE FUNCTION public.compute_lesson_fee(
  p_billing_kind text,
  p_has_adult_tariff boolean,
  p_tariffs jsonb,
  p_date_of_birth date,
  p_start_date date,
  p_end_date date,
  p_month date)
RETURNS TABLE (
  amount_cents bigint,
  age_category text,
  btw_rate integer,
  amount_excl_btw_cents bigint,
  btw_amount_cents bigint,
  is_prorated boolean,
  tariff_effective_from date)
LANGUAGE plpgsql IMMUTABLE SET search_path = public
AS $$
DECLARE
  v_month date := date_trunc('month', p_month)::date;
  v_month_end date := (date_trunc('month', p_month) + interval '1 month - 1 day')::date;
  v_tariff jsonb;
  v_under bigint;
  v_adult bigint;
  v_category text;
  v_base bigint;
  v_amount bigint;
  v_prorated boolean := false;
  v_adult_from date;
BEGIN
  -- No billing in August, before the start month or after the end date.
  IF extract(month FROM v_month) = 8
     OR p_start_date > v_month_end
     OR (p_end_date IS NOT NULL AND p_end_date < v_month)
     OR (p_billing_kind = 'one_off' AND date_trunc('month', p_start_date)::date <> v_month) THEN
    RETURN QUERY SELECT 0::bigint, NULL::text, 0, 0::bigint, 0::bigint, false, NULL::date;
    RETURN;
  END IF;

  SELECT t INTO v_tariff
  FROM jsonb_array_elements(COALESCE(p_tariffs, '[]'::jsonb)) t
  WHERE (t->>'effective_from')::date <= v_month
  ORDER BY (t->>'effective_from')::date DESC
  LIMIT 1;

  IF v_tariff IS NULL THEN
    RAISE EXCEPTION 'Geen tarief ingesteld per %', to_char(v_month, 'DD-MM-YYYY')
      USING ERRCODE = 'P0001';
  END IF;

  v_under := NULLIF(v_tariff->>'amount_under_21_cents', '')::bigint;
  v_adult := CASE WHEN p_has_adult_tariff THEN NULLIF(v_tariff->>'amount_adult_cents', '')::bigint END;

  IF v_under IS NULL AND v_adult IS NULL THEN
    RAISE EXCEPTION 'Geen tarief ingesteld per %', to_char(v_month, 'DD-MM-YYYY')
      USING ERRCODE = 'P0001';
  END IF;

  IF v_adult IS NULL THEN
    v_category := 'under_21';
  ELSIF v_under IS NULL THEN
    v_category := '21_plus';
  ELSE
    IF p_date_of_birth IS NULL THEN
      RAISE EXCEPTION 'Geboortedatum ontbreekt: nodig om te bepalen of het tarief onder 21 of 21+ geldt'
        USING ERRCODE = 'P0001';
    END IF;
    -- 21+ applies from the 1st of the month after the 21st birthday.
    v_adult_from := (date_trunc('month', p_date_of_birth + interval '21 years') + interval '1 month')::date;
    v_category := CASE WHEN v_month >= v_adult_from THEN '21_plus' ELSE 'under_21' END;
  END IF;

  v_base := CASE WHEN v_category = '21_plus' THEN v_adult ELSE v_under END;
  v_amount := v_base;

  -- First month pro rata on calendar days (start day included).
  IF p_billing_kind = 'monthly' AND p_start_date > v_month THEN
    v_amount := round(v_base::numeric * ((v_month_end - p_start_date) + 1) / ((v_month_end - v_month) + 1));
    v_prorated := true;
  END IF;

  IF v_category = '21_plus' THEN
    RETURN QUERY SELECT v_amount, v_category, 21,
      round(v_amount::numeric / 1.21)::bigint,
      v_amount - round(v_amount::numeric / 1.21)::bigint,
      v_prorated, (v_tariff->>'effective_from')::date;
  ELSE
    RETURN QUERY SELECT v_amount, v_category, 0, v_amount, 0::bigint,
      v_prorated, (v_tariff->>'effective_from')::date;
  END IF;
END;
$$;
-- END PURE TARIFF FUNCTIONS

-- =============================================================================
-- Lesson forms (lesson_type_options) and tariffs with effective date
-- =============================================================================
ALTER TABLE public.lesson_type_options
  ADD COLUMN IF NOT EXISTS billing_kind text NOT NULL DEFAULT 'monthly'
    CHECK (billing_kind IN ('monthly', 'one_off')),
  ADD COLUMN IF NOT EXISTS has_adult_tariff boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS label text;

-- Price per lesson is no longer the fee source (kept nullable until the Stripe phases).
ALTER TABLE public.lesson_type_options ALTER COLUMN price_per_lesson DROP NOT NULL;
DROP INDEX IF EXISTS public.idx_lesson_type_options_unique_duration_frequency_price;
CREATE UNIQUE INDEX IF NOT EXISTS idx_lesson_type_options_unique_form
  ON public.lesson_type_options (lesson_type_id, duration_minutes, frequency, COALESCE(label, ''));

CREATE TABLE public.lesson_type_option_tariffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_type_option_id uuid NOT NULL REFERENCES public.lesson_type_options(id) ON DELETE CASCADE,
  effective_from date NOT NULL,
  amount_under_21_cents bigint CHECK (amount_under_21_cents IS NULL OR amount_under_21_cents > 0),
  amount_adult_cents bigint CHECK (amount_adult_cents IS NULL OR amount_adult_cents > 0),
  CONSTRAINT lesson_type_option_tariffs_has_amount
    CHECK (amount_under_21_cents IS NOT NULL OR amount_adult_cents IS NOT NULL),
  CONSTRAINT lesson_type_option_tariffs_unique_date UNIQUE (lesson_type_option_id, effective_from)
);
SELECT public.apply_audit_trail('public.lesson_type_option_tariffs');

GRANT SELECT ON public.lesson_type_option_tariffs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_type_option_tariffs TO authenticated;
GRANT ALL ON public.lesson_type_option_tariffs TO service_role;
ALTER TABLE public.lesson_type_option_tariffs ENABLE ROW LEVEL SECURITY;

-- Tariffs are the published price list: readable for everyone (also the public signup form).
CREATE POLICY lesson_type_option_tariffs_select ON public.lesson_type_option_tariffs
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY lesson_type_option_tariffs_insert ON public.lesson_type_option_tariffs
  FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR public.is_site_admin());
CREATE POLICY lesson_type_option_tariffs_update ON public.lesson_type_option_tariffs
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_site_admin())
  WITH CHECK (public.is_admin() OR public.is_site_admin());
CREATE POLICY lesson_type_option_tariffs_delete ON public.lesson_type_option_tariffs
  FOR DELETE TO authenticated USING (public.is_admin() OR public.is_site_admin());

-- A lesson form without 21+ tariff may not get a 21+ amount.
CREATE OR REPLACE FUNCTION public.validate_lesson_type_option_tariff()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.amount_adult_cents IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.lesson_type_options o
    WHERE o.id = NEW.lesson_type_option_id AND o.has_adult_tariff = false
  ) THEN
    RAISE EXCEPTION 'Deze lesvorm heeft geen 21+-tarief';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.validate_lesson_type_option_tariff() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_validate_lesson_type_option_tariff
  BEFORE INSERT OR UPDATE ON public.lesson_type_option_tariffs
  FOR EACH ROW EXECUTE FUNCTION public.validate_lesson_type_option_tariff();

-- =============================================================================
-- Agreements: lesson form, term and cancellation
-- =============================================================================
ALTER TABLE public.lesson_agreements
  ADD COLUMN IF NOT EXISTS lesson_type_option_id uuid
    REFERENCES public.lesson_type_options(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS minimum_term_end date,
  ADD COLUMN IF NOT EXISTS cancellation_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_effective_date date;
CREATE INDEX IF NOT EXISTS idx_lesson_agreements_lesson_type_option
  ON public.lesson_agreements (lesson_type_option_id);

ALTER TABLE public.lesson_agreements ALTER COLUMN price_per_lesson DROP NOT NULL;
ALTER TABLE public.lesson_agreements DROP COLUMN IF EXISTS monthly_amount_cents;
ALTER TABLE public.lesson_groups ALTER COLUMN price_per_lesson DROP NOT NULL;

-- Fill lesson form (when missing) and minimum term on every agreement write.
CREATE OR REPLACE FUNCTION public.set_lesson_agreement_tariff_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.lesson_type_option_id IS NULL THEN
    SELECT o.id INTO NEW.lesson_type_option_id
    FROM public.lesson_type_options o
    WHERE o.lesson_type_id = NEW.lesson_type_id
      AND o.duration_minutes = NEW.duration_minutes
      AND o.frequency = NEW.frequency
    ORDER BY o.label NULLS FIRST, o.created_at
    LIMIT 1;
  END IF;
  NEW.minimum_term_end := public.compute_minimum_term_end(NEW.start_date);
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_lesson_agreement_tariff_fields() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_set_lesson_agreement_tariff_fields
  BEFORE INSERT OR UPDATE OF lesson_type_option_id, lesson_type_id, duration_minutes, frequency, start_date
  ON public.lesson_agreements
  FOR EACH ROW EXECUTE FUNCTION public.set_lesson_agreement_tariff_fields();

-- Backfill existing (test) agreements.
UPDATE public.lesson_agreements la
   SET lesson_type_option_id = (
         SELECT o.id FROM public.lesson_type_options o
         WHERE o.lesson_type_id = la.lesson_type_id
           AND o.duration_minutes = la.duration_minutes
           AND o.frequency = la.frequency
         ORDER BY o.label NULLS FIRST, o.created_at
         LIMIT 1),
       minimum_term_end = public.compute_minimum_term_end(la.start_date)
 WHERE la.lesson_type_option_id IS NULL OR la.minimum_term_end IS NULL;

-- =============================================================================
-- Settings: cancellation notice
-- =============================================================================
ALTER TABLE public.accounting_settings
  ADD COLUMN IF NOT EXISTS cancellation_notice_days integer NOT NULL DEFAULT 30
    CHECK (cancellation_notice_days >= 0 AND cancellation_notice_days <= 365);

-- =============================================================================
-- Batch items keep the VAT breakdown of the fee calculation
-- =============================================================================
ALTER TABLE public.direct_debit_batch_items
  ADD COLUMN IF NOT EXISTS age_category text CHECK (age_category IN ('under_21', '21_plus')),
  ADD COLUMN IF NOT EXISTS btw_rate integer CHECK (btw_rate IN (0, 21)),
  ADD COLUMN IF NOT EXISTS amount_excl_btw_cents bigint,
  ADD COLUMN IF NOT EXISTS btw_amount_cents bigint;

-- =============================================================================
-- Data wrappers around the pure rules
-- =============================================================================
CREATE OR REPLACE FUNCTION public.option_tariffs_json(p_option_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'effective_from', t.effective_from,
    'amount_under_21_cents', t.amount_under_21_cents,
    'amount_adult_cents', t.amount_adult_cents)), '[]'::jsonb)
  FROM public.lesson_type_option_tariffs t
  WHERE t.lesson_type_option_id = p_option_id
$$;
REVOKE EXECUTE ON FUNCTION public.option_tariffs_json(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.option_tariffs_json(uuid) TO authenticated, service_role;

-- Client RPC: fee for a lesson form before an agreement exists (wizard preview).
-- Takes only parameters and reads the public price list, so it reveals no personal data.
CREATE OR REPLACE FUNCTION public.preview_lesson_fee(
  p_lesson_type_option_id uuid,
  p_date_of_birth date,
  p_start_date date,
  p_end_date date,
  p_month date)
RETURNS TABLE (
  amount_cents bigint, age_category text, btw_rate integer,
  amount_excl_btw_cents bigint, btw_amount_cents bigint,
  is_prorated boolean, tariff_effective_from date)
LANGUAGE plpgsql STABLE SET search_path = public
AS $$
DECLARE
  v_option public.lesson_type_options%ROWTYPE;
BEGIN
  SELECT * INTO v_option FROM public.lesson_type_options WHERE id = p_lesson_type_option_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lesvorm niet gevonden'; END IF;
  RETURN QUERY SELECT * FROM public.compute_lesson_fee(
    v_option.billing_kind, v_option.has_adult_tariff,
    public.option_tariffs_json(v_option.id),
    p_date_of_birth, p_start_date, p_end_date, p_month);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.preview_lesson_fee(uuid, date, date, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preview_lesson_fee(uuid, date, date, date, date) TO authenticated, service_role;

-- Fee of a stored agreement for one month (server-side only).
CREATE OR REPLACE FUNCTION public.compute_agreement_month_fee(p_agreement_id uuid, p_month date)
RETURNS TABLE (
  amount_cents bigint, age_category text, btw_rate integer,
  amount_excl_btw_cents bigint, btw_amount_cents bigint,
  is_prorated boolean, tariff_effective_from date)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_la public.lesson_agreements%ROWTYPE;
  v_option public.lesson_type_options%ROWTYPE;
  v_dob date;
BEGIN
  SELECT * INTO v_la FROM public.lesson_agreements WHERE id = p_agreement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Overeenkomst niet gevonden'; END IF;
  SELECT * INTO v_option FROM public.lesson_type_options WHERE id = v_la.lesson_type_option_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Overeenkomst heeft geen lesvorm met tarief'; END IF;
  SELECT s.date_of_birth INTO v_dob FROM public.students s WHERE s.user_id = v_la.student_user_id;
  RETURN QUERY SELECT * FROM public.compute_lesson_fee(
    v_option.billing_kind, v_option.has_adult_tariff,
    public.option_tariffs_json(v_option.id),
    v_dob, v_la.start_date,
    LEAST(v_la.end_date, v_la.cancellation_effective_date),
    p_month);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.compute_agreement_month_fee(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.compute_agreement_month_fee(uuid, date) TO service_role;

-- Client RPC: cancel an agreement per the end of the running period.
CREATE OR REPLACE FUNCTION public.cancel_lesson_agreement(p_agreement_id uuid, p_requested_on date DEFAULT CURRENT_DATE)
RETURNS date LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_la public.lesson_agreements%ROWTYPE;
  v_notice integer;
  v_end date;
BEGIN
  IF NOT (public.is_admin() OR public.is_site_admin() OR public.is_staff()) THEN
    RAISE EXCEPTION 'insufficient_privileges' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_la FROM public.lesson_agreements WHERE id = p_agreement_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Overeenkomst niet gevonden'; END IF;
  SELECT cancellation_notice_days INTO v_notice FROM public.accounting_settings WHERE id = true;
  v_end := public.compute_cancellation_effective_date(
    COALESCE(v_la.minimum_term_end, public.compute_minimum_term_end(v_la.start_date)),
    p_requested_on, COALESCE(v_notice, 30));
  IF v_la.end_date IS NOT NULL AND v_la.end_date < v_end THEN
    v_end := v_la.end_date;
  END IF;
  UPDATE public.lesson_agreements
     SET cancellation_requested_at = now(),
         cancellation_effective_date = v_end,
         end_date = v_end
   WHERE id = p_agreement_id;
  RETURN v_end;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cancel_lesson_agreement(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_lesson_agreement(uuid, date) TO authenticated, service_role;

-- =============================================================================
-- SEPA batch: amounts from the fee rules, VAT breakdown stored per item
-- =============================================================================
CREATE OR REPLACE FUNCTION public.build_direct_debit_batch_items(p_batch_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
  v_batch public.direct_debit_batches%ROWTYPE;
  v_template text;
  v_row record;
  v_fee record;
BEGIN
  IF NOT (public.is_admin() OR public.is_site_admin()) THEN
    RAISE EXCEPTION 'insufficient_privileges';
  END IF;
  SELECT * INTO v_batch FROM public.direct_debit_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'batch_not_found'; END IF;
  IF v_batch.status <> 'draft' THEN RAISE EXCEPTION 'batch_not_draft'; END IF;
  SELECT sepa_remittance_template INTO v_template FROM public.accounting_settings WHERE id = true;
  v_template := COALESCE(v_template, 'Lesgeld {periode} - {leerling}');
  DELETE FROM public.direct_debit_batch_items WHERE batch_id = p_batch_id;

  FOR v_row IN
    SELECT la.id AS agreement_id, la.student_user_id, m.id AS mandate_id, m.first_used_at,
           trim(both ' ' from coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')) AS student_name
    FROM public.lesson_agreements la
    JOIN public.sepa_mandates m ON m.id = la.sepa_mandate_id AND m.status = 'active'
    JOIN public.profiles p ON p.user_id = la.student_user_id
    WHERE la.is_active = true AND la.payment_method = 'sepa'
    ORDER BY la.id
  LOOP
    BEGIN
      SELECT * INTO v_fee FROM public.compute_agreement_month_fee(v_row.agreement_id, v_batch.collection_date);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Leerling %: %', v_row.student_name, SQLERRM;
    END;
    CONTINUE WHEN v_fee.amount_cents IS NULL OR v_fee.amount_cents <= 0;

    INSERT INTO public.direct_debit_batch_items (
      batch_id, lesson_agreement_id, mandate_id, student_user_id,
      end_to_end_id, amount_cents, remittance_info, kind, sequence_type,
      age_category, btw_rate, amount_excl_btw_cents, btw_amount_cents
    ) VALUES (
      p_batch_id, v_row.agreement_id, v_row.mandate_id, v_row.student_user_id,
      'E2E-' || to_char(v_batch.collection_date,'YYYYMM') || '-' || replace(v_row.agreement_id::text,'-',''),
      v_fee.amount_cents,
      replace(replace(v_template,
        '{periode}', to_char(v_batch.collection_date, 'YYYY-MM')),
        '{leerling}', v_row.student_name),
      'subscription',
      CASE WHEN v_row.first_used_at IS NULL THEN 'FRST' ELSE 'RCUR' END,
      v_fee.age_category, v_fee.btw_rate, v_fee.amount_excl_btw_cents, v_fee.btw_amount_cents
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  PERFORM public.recalc_direct_debit_batch(p_batch_id);
  RETURN v_inserted;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.build_direct_debit_batch_items(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.build_direct_debit_batch_items(uuid) TO authenticated;