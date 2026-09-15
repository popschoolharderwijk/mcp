-- SEPA-incasso naast Stripe
ALTER TABLE public.accounting_settings
  ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'stripe'
    CHECK (payment_provider IN ('stripe','sepa')),
  ADD COLUMN IF NOT EXISTS sepa_creditor_name text,
  ADD COLUMN IF NOT EXISTS sepa_creditor_iban text,
  ADD COLUMN IF NOT EXISTS sepa_creditor_bic text,
  ADD COLUMN IF NOT EXISTS sepa_creditor_id text,
  ADD COLUMN IF NOT EXISTS sepa_collection_day integer NOT NULL DEFAULT 27
    CHECK (sepa_collection_day BETWEEN 1 AND 28),
  ADD COLUMN IF NOT EXISTS sepa_remittance_template text NOT NULL
    DEFAULT 'Lesgeld {periode} - {leerling}',
  ADD COLUMN IF NOT EXISTS sepa_mandate_prefix text NOT NULL DEFAULT 'MND',
  ADD COLUMN IF NOT EXISTS sepa_mandate_next_seq integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS account_bank_sepa text NOT NULL DEFAULT '1102';

-- IBAN validator
CREATE OR REPLACE FUNCTION public.is_valid_iban(p_iban text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = public
AS $$
DECLARE
  v text; rearranged text; numeric_str text := ''; ch text;
  code int; remainder bigint := 0;
BEGIN
  IF p_iban IS NULL THEN RETURN false; END IF;
  v := upper(regexp_replace(p_iban, '\s', '', 'g'));
  IF v !~ '^[A-Z0-9]{15,34}$' THEN RETURN false; END IF;
  rearranged := substring(v FROM 5) || substring(v FROM 1 FOR 4);
  FOR i IN 1..length(rearranged) LOOP
    ch := substring(rearranged FROM i FOR 1);
    IF ch ~ '^[0-9]$' THEN numeric_str := numeric_str || ch;
    ELSE code := ascii(ch) - 55; numeric_str := numeric_str || code::text;
    END IF;
  END LOOP;
  FOR i IN 1..length(numeric_str) LOOP
    remainder := (remainder * 10 + substring(numeric_str FROM i FOR 1)::int) % 97;
  END LOOP;
  RETURN remainder = 1;
END;
$$;

-- sepa_mandates
CREATE TABLE public.sepa_mandates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  mandate_reference text NOT NULL UNIQUE,
  iban text NOT NULL,
  bic text,
  account_holder text NOT NULL,
  signed_at date,
  signature_method text NOT NULL DEFAULT 'digital'
    CHECK (signature_method IN ('digital','paper')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','revoked')),
  sequence_type text NOT NULL DEFAULT 'FRST'
    CHECK (sequence_type IN ('FRST','RCUR','OOFF','FNAL')),
  first_used_at timestamptz,
  revoked_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  CONSTRAINT sepa_mandates_iban_valid CHECK (public.is_valid_iban(iban))
);
CREATE INDEX idx_sepa_mandates_student ON public.sepa_mandates(student_user_id);
CREATE INDEX idx_sepa_mandates_status ON public.sepa_mandates(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sepa_mandates TO authenticated;
GRANT ALL ON public.sepa_mandates TO service_role;
REVOKE ALL ON TABLE public.sepa_mandates FROM anon;
ALTER TABLE public.sepa_mandates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sepa_mandates FORCE ROW LEVEL SECURITY;
CREATE POLICY sepa_mandates_select ON public.sepa_mandates
  FOR SELECT TO authenticated
  USING (is_privileged() OR student_user_id = auth.uid());
CREATE POLICY sepa_mandates_insert ON public.sepa_mandates
  FOR INSERT TO authenticated WITH CHECK (is_admin() OR is_site_admin());
CREATE POLICY sepa_mandates_update ON public.sepa_mandates
  FOR UPDATE TO authenticated
  USING (is_admin() OR is_site_admin())
  WITH CHECK (is_admin() OR is_site_admin());
CREATE POLICY sepa_mandates_delete ON public.sepa_mandates
  FOR DELETE TO authenticated USING (is_admin() OR is_site_admin());
CREATE TRIGGER trg_audit_sepa_mandates
  BEFORE INSERT OR UPDATE ON public.sepa_mandates
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

-- incasso_batches
CREATE TABLE public.incasso_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','approved','submitted','closed','cancelled')),
  collection_date date NOT NULL,
  message_id text UNIQUE,
  xml_sha256 text,
  xml_storage_path text,
  total_amount_cents bigint NOT NULL DEFAULT 0,
  item_count integer NOT NULL DEFAULT 0,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  submitted_at timestamptz,
  closed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);
CREATE INDEX idx_incasso_batches_status ON public.incasso_batches(status);
CREATE INDEX idx_incasso_batches_collection_date ON public.incasso_batches(collection_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incasso_batches TO authenticated;
GRANT ALL ON public.incasso_batches TO service_role;
REVOKE ALL ON TABLE public.incasso_batches FROM anon;
ALTER TABLE public.incasso_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incasso_batches FORCE ROW LEVEL SECURITY;
CREATE POLICY incasso_batches_select ON public.incasso_batches
  FOR SELECT TO authenticated USING (is_privileged());
CREATE POLICY incasso_batches_insert ON public.incasso_batches
  FOR INSERT TO authenticated WITH CHECK (is_admin() OR is_site_admin());
CREATE POLICY incasso_batches_update ON public.incasso_batches
  FOR UPDATE TO authenticated
  USING (is_admin() OR is_site_admin())
  WITH CHECK (is_admin() OR is_site_admin());
CREATE POLICY incasso_batches_delete ON public.incasso_batches
  FOR DELETE TO authenticated USING (is_admin() OR is_site_admin());
CREATE TRIGGER trg_audit_incasso_batches
  BEFORE INSERT OR UPDATE ON public.incasso_batches
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

-- incasso_batch_items
CREATE TABLE public.incasso_batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.incasso_batches(id) ON DELETE CASCADE,
  lesson_agreement_id uuid REFERENCES public.lesson_agreements(id) ON DELETE SET NULL,
  mandate_id uuid NOT NULL REFERENCES public.sepa_mandates(id) ON DELETE RESTRICT,
  student_user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
  end_to_end_id text NOT NULL UNIQUE,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'EUR',
  remittance_info text NOT NULL,
  kind text NOT NULL DEFAULT 'subscription'
    CHECK (kind IN ('subscription','correction','manual')),
  sequence_type text NOT NULL DEFAULT 'RCUR'
    CHECK (sequence_type IN ('FRST','RCUR','OOFF','FNAL')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','submitted','accepted','rejected','reversed')),
  reason_code text,
  status_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);
CREATE INDEX idx_incasso_items_batch ON public.incasso_batch_items(batch_id);
CREATE INDEX idx_incasso_items_student ON public.incasso_batch_items(student_user_id);
CREATE INDEX idx_incasso_items_mandate ON public.incasso_batch_items(mandate_id);
CREATE INDEX idx_incasso_items_status ON public.incasso_batch_items(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incasso_batch_items TO authenticated;
GRANT ALL ON public.incasso_batch_items TO service_role;
REVOKE ALL ON TABLE public.incasso_batch_items FROM anon;
ALTER TABLE public.incasso_batch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incasso_batch_items FORCE ROW LEVEL SECURITY;
CREATE POLICY incasso_items_select ON public.incasso_batch_items
  FOR SELECT TO authenticated
  USING (is_privileged() OR student_user_id = auth.uid());
CREATE POLICY incasso_items_insert ON public.incasso_batch_items
  FOR INSERT TO authenticated WITH CHECK (is_admin() OR is_site_admin());
CREATE POLICY incasso_items_update ON public.incasso_batch_items
  FOR UPDATE TO authenticated
  USING (is_admin() OR is_site_admin())
  WITH CHECK (is_admin() OR is_site_admin());
CREATE POLICY incasso_items_delete ON public.incasso_batch_items
  FOR DELETE TO authenticated USING (is_admin() OR is_site_admin());
CREATE TRIGGER trg_audit_incasso_items
  BEFORE INSERT OR UPDATE ON public.incasso_batch_items
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

-- lesson_agreements uitbreiden
ALTER TABLE public.lesson_agreements
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'stripe'
    CHECK (payment_method IN ('stripe','sepa','manual')),
  ADD COLUMN IF NOT EXISTS monthly_amount_cents bigint,
  ADD COLUMN IF NOT EXISTS sepa_mandate_id uuid
    REFERENCES public.sepa_mandates(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_lesson_agreements_payment_method
  ON public.lesson_agreements(payment_method);
CREATE INDEX IF NOT EXISTS idx_lesson_agreements_sepa_mandate
  ON public.lesson_agreements(sepa_mandate_id);

-- next_mandate_reference (admin/site_admin client RPC; service_role for edge functions)
CREATE OR REPLACE FUNCTION public.next_mandate_reference()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_prefix text; v_seq integer;
BEGIN
  -- Null session = service_role / seed; authenticated callers must be admin or site_admin
  IF public.current_user_id() IS NOT NULL
     AND NOT (public.is_admin() OR public.is_site_admin()) THEN
    RAISE EXCEPTION 'insufficient_privileges' USING ERRCODE = '42501';
  END IF;
  UPDATE public.accounting_settings
     SET sepa_mandate_next_seq = sepa_mandate_next_seq + 1, updated_at = now()
   WHERE id = true
   RETURNING sepa_mandate_prefix, sepa_mandate_next_seq - 1
   INTO v_prefix, v_seq;
  IF v_prefix IS NULL THEN RAISE EXCEPTION 'accounting_settings ontbreekt'; END IF;
  RETURN v_prefix || '-' || lpad(v_seq::text, 6, '0');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.next_mandate_reference() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_mandate_reference() TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_mandate_reference() TO service_role;

-- recalc_incasso_batch (called from build_incasso_batch_items / service_role; not a client RPC)
CREATE OR REPLACE FUNCTION public.recalc_incasso_batch(p_batch_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.incasso_batches b
     SET total_amount_cents = COALESCE((SELECT SUM(amount_cents) FROM public.incasso_batch_items WHERE batch_id = p_batch_id), 0),
         item_count = COALESCE((SELECT COUNT(*) FROM public.incasso_batch_items WHERE batch_id = p_batch_id), 0),
         updated_at = now()
   WHERE b.id = p_batch_id;
$$;
REVOKE EXECUTE ON FUNCTION public.recalc_incasso_batch(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_incasso_batch(uuid) TO service_role;

-- build_incasso_batch_items
CREATE OR REPLACE FUNCTION public.build_incasso_batch_items(p_batch_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
  v_batch public.incasso_batches%ROWTYPE;
  v_template text;
BEGIN
  IF NOT (public.is_admin() OR public.is_site_admin()) THEN
    RAISE EXCEPTION 'insufficient_privileges';
  END IF;
  SELECT * INTO v_batch FROM public.incasso_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'batch_not_found'; END IF;
  IF v_batch.status <> 'draft' THEN RAISE EXCEPTION 'batch_not_draft'; END IF;
  SELECT sepa_remittance_template INTO v_template FROM public.accounting_settings WHERE id = true;
  v_template := COALESCE(v_template, 'Lesgeld {periode} - {leerling}');
  DELETE FROM public.incasso_batch_items WHERE batch_id = p_batch_id;
  INSERT INTO public.incasso_batch_items (
    batch_id, lesson_agreement_id, mandate_id, student_user_id,
    end_to_end_id, amount_cents, remittance_info, kind, sequence_type
  )
  SELECT
    p_batch_id, la.id, m.id, la.student_user_id,
    'E2E-' || to_char(v_batch.collection_date,'YYYYMM') || '-' || replace(la.id::text,'-',''),
    COALESCE(la.monthly_amount_cents, (la.price_per_lesson * 100)::bigint),
    replace(replace(v_template,
        '{periode}', to_char(v_batch.collection_date, 'YYYY-MM')),
        '{leerling}', trim(both ' ' from coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,''))),
    'subscription',
    CASE WHEN m.first_used_at IS NULL THEN 'FRST' ELSE 'RCUR' END
  FROM public.lesson_agreements la
  JOIN public.sepa_mandates m
    ON m.id = la.sepa_mandate_id AND m.status = 'active'
  JOIN public.profiles p ON p.user_id = la.student_user_id
  WHERE la.is_active = true
    AND la.payment_method = 'sepa'
    AND COALESCE(la.monthly_amount_cents, (la.price_per_lesson * 100)::bigint) > 0;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  PERFORM public.recalc_incasso_batch(p_batch_id);
  RETURN v_inserted;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.build_incasso_batch_items(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.build_incasso_batch_items(uuid) TO authenticated;
-- Private sepa-batches bucket (policies below assume this exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sepa-batches',
  'sepa-batches',
  false,
  10485760,
  ARRAY['application/xml', 'text/xml', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies for private sepa-batches bucket
CREATE POLICY sepa_batches_objects_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'sepa-batches' AND (public.is_admin() OR public.is_site_admin()));

CREATE POLICY sepa_batches_objects_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sepa-batches' AND (public.is_admin() OR public.is_site_admin()));

CREATE POLICY sepa_batches_objects_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'sepa-batches' AND (public.is_admin() OR public.is_site_admin()))
  WITH CHECK (bucket_id = 'sepa-batches' AND (public.is_admin() OR public.is_site_admin()));

CREATE POLICY sepa_batches_objects_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'sepa-batches' AND (public.is_admin() OR public.is_site_admin()));