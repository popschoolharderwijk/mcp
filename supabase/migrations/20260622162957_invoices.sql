
-- 1. accounting_settings uitbreiden met bedrijfs- en factuurgegevens
ALTER TABLE public.accounting_settings
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_address text,
  ADD COLUMN IF NOT EXISTS company_postcode text,
  ADD COLUMN IF NOT EXISTS company_city text,
  ADD COLUMN IF NOT EXISTS company_kvk text,
  ADD COLUMN IF NOT EXISTS company_btw_nummer text,
  ADD COLUMN IF NOT EXISTS company_iban text,
  ADD COLUMN IF NOT EXISTS company_email text DEFAULT 'info@popschoolharderwijk.nl',
  ADD COLUMN IF NOT EXISTS company_phone text,
  ADD COLUMN IF NOT EXISTS company_logo_url text,
  ADD COLUMN IF NOT EXISTS invoice_number_prefix text NOT NULL DEFAULT 'INV-',
  ADD COLUMN IF NOT EXISTS invoice_number_next integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS invoice_payment_term_days integer NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS invoice_footer_text text;

-- 2. next_invoice_number()
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_prefix text; v_seq integer; v_year text;
BEGIN
  UPDATE public.accounting_settings
     SET invoice_number_next = invoice_number_next + 1, updated_at = now()
   WHERE id = true
   RETURNING invoice_number_prefix, invoice_number_next - 1
   INTO v_prefix, v_seq;
  IF v_prefix IS NULL THEN RAISE EXCEPTION 'accounting_settings ontbreekt'; END IF;
  v_year := to_char(now(), 'YYYY');
  RETURN v_prefix || v_year || '-' || lpad(v_seq::text, 5, '0');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.next_invoice_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO service_role;

-- 3. invoices
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  student_user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
  batch_id uuid REFERENCES public.direct_debit_batches(id) ON DELETE SET NULL,
  issue_date date NOT NULL DEFAULT current_date,
  due_date date NOT NULL,
  period_start date,
  period_end date,
  amount_excl_btw_cents bigint NOT NULL DEFAULT 0,
  btw_amount_cents bigint NOT NULL DEFAULT 0,
  amount_total_cents bigint NOT NULL DEFAULT 0,
  age_category text NOT NULL DEFAULT 'unknown'
    CHECK (age_category IN ('under_21','21_plus','unknown','mixed')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','issued','paid','cancelled')),
  pdf_storage_path text,
  sent_at timestamptz,
  paid_at timestamptz,
  email_sent_to text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE (batch_id, student_user_id)
);
CREATE INDEX idx_invoices_student ON public.invoices(student_user_id);
CREATE INDEX idx_invoices_batch ON public.invoices(batch_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_issue_date ON public.invoices(issue_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
REVOKE ALL ON TABLE public.invoices FROM anon;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices FORCE ROW LEVEL SECURITY;

CREATE POLICY invoices_select ON public.invoices
  FOR SELECT TO authenticated
  USING (is_privileged() OR student_user_id = auth.uid());
CREATE POLICY invoices_insert ON public.invoices
  FOR INSERT TO authenticated WITH CHECK (is_admin() OR is_site_admin());
CREATE POLICY invoices_update ON public.invoices
  FOR UPDATE TO authenticated
  USING (is_admin() OR is_site_admin())
  WITH CHECK (is_admin() OR is_site_admin());
CREATE POLICY invoices_delete ON public.invoices
  FOR DELETE TO authenticated USING (is_admin() OR is_site_admin());

CREATE TRIGGER trg_audit_invoices
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

-- 4. invoice_lines
CREATE TABLE public.invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  batch_item_id uuid REFERENCES public.direct_debit_batch_items(id) ON DELETE SET NULL,
  description text NOT NULL,
  lesson_date date,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price_cents bigint NOT NULL DEFAULT 0,
  btw_rate integer NOT NULL DEFAULT 0 CHECK (btw_rate IN (0, 9, 21)),
  amount_excl_btw_cents bigint NOT NULL DEFAULT 0,
  btw_amount_cents bigint NOT NULL DEFAULT 0,
  amount_total_cents bigint NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);
CREATE INDEX idx_invoice_lines_invoice ON public.invoice_lines(invoice_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_lines TO authenticated;
GRANT ALL ON public.invoice_lines TO service_role;
REVOKE ALL ON TABLE public.invoice_lines FROM anon;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines FORCE ROW LEVEL SECURITY;

CREATE POLICY invoice_lines_select ON public.invoice_lines
  FOR SELECT TO authenticated
  USING (
    is_privileged()
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_lines.invoice_id
        AND i.student_user_id = auth.uid()
    )
  );
CREATE POLICY invoice_lines_insert ON public.invoice_lines
  FOR INSERT TO authenticated WITH CHECK (is_admin() OR is_site_admin());
CREATE POLICY invoice_lines_update ON public.invoice_lines
  FOR UPDATE TO authenticated
  USING (is_admin() OR is_site_admin())
  WITH CHECK (is_admin() OR is_site_admin());
CREATE POLICY invoice_lines_delete ON public.invoice_lines
  FOR DELETE TO authenticated USING (is_admin() OR is_site_admin());

CREATE TRIGGER trg_audit_invoice_lines
  BEFORE INSERT OR UPDATE ON public.invoice_lines
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

-- Private invoices bucket (policies below assume this exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('invoices', 'invoices', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies for private invoices bucket
CREATE POLICY "invoices_storage_admin_all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'invoices' AND (public.is_admin() OR public.is_site_admin()))
  WITH CHECK (bucket_id = 'invoices' AND (public.is_admin() OR public.is_site_admin()));

CREATE POLICY "invoices_storage_student_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'invoices'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Extend cleanup_student_if_no_agreements: block auto-delete when billing/trial data remains
CREATE OR REPLACE FUNCTION public.cleanup_student_if_no_agreements(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF public.current_user_id() IS NOT NULL
     AND public.current_user_id() IS DISTINCT FROM _user_id
     AND NOT public.is_privileged() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.lesson_agreements WHERE student_user_id = _user_id
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.invoices WHERE student_user_id = _user_id) THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.sepa_mandates WHERE student_user_id = _user_id) THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.direct_debit_batch_items WHERE student_user_id = _user_id) THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.stripe_customers WHERE user_id = _user_id) THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.trial_lessons WHERE student_user_id = _user_id) THEN
    RETURN;
  END IF;

  DELETE FROM public.students WHERE user_id = _user_id;
END;
$$;

ALTER FUNCTION public.cleanup_student_if_no_agreements(UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.cleanup_student_if_no_agreements(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_student_if_no_agreements(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_student_if_no_agreements(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_student_if_no_agreements(UUID) TO service_role;

-- Accounting report reads school invoices. JSON key stripe_invoice_id stays the invoice number.
CREATE FUNCTION public.get_accounting_report(
  p_start_date date,
  p_end_date date
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_result json;
BEGIN
  IF public.current_user_id() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_privileged() THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

  WITH
  invoice_base AS (
    SELECT
      i.id AS invoice_id,
      il.id AS line_id,
      il.sort_order,
      i.invoice_number AS stripe_invoice_id,
      i.status,
      il.amount_total_cents AS amount_due,
      CASE WHEN i.status = 'paid' THEN il.amount_total_cents ELSE 0 END AS amount_paid,
      lower(settings.currency) AS currency,
      COALESCE(i.period_start, i.issue_date) AS period_start,
      i.paid_at,
      NULL::text AS hosted_invoice_url,
      CASE
        WHEN il.btw_rate > 0 THEN '21_plus'
        WHEN i.age_category = 'unknown' THEN 'unknown'
        ELSE 'under_21'
      END AS age_category,
      il.amount_excl_btw_cents,
      il.btw_amount_cents,
      CASE
        WHEN il.btw_rate = 0 AND i.age_category IS DISTINCT FROM 'unknown' THEN il.amount_excl_btw_cents
        ELSE 0
      END AS excl_under_21_cents,
      CASE
        WHEN il.btw_rate = 0 AND i.age_category = 'unknown' THEN il.amount_excl_btw_cents
        ELSE 0
      END AS excl_unknown_cents,
      CASE WHEN il.btw_rate > 0 THEN il.amount_excl_btw_cents ELSE 0 END AS excl_21_plus_cents,
      i.student_user_id,
      by_agreement.id AS lesson_type_id,
      by_agreement.name AS lesson_type_name,
      by_agreement.icon AS lesson_type_icon,
      by_agreement.color AS lesson_type_color,
      COALESCE(NULLIF(by_agreement.cost_center, ''), by_agreement.name, 'Onbekend') AS cost_center,
      sp.first_name AS student_first_name,
      sp.last_name AS student_last_name,
      sp.email AS student_email
    FROM public.invoices i
    JOIN public.invoice_lines il ON il.invoice_id = i.id
    CROSS JOIN public.accounting_settings settings
    LEFT JOIN public.direct_debit_batch_items bi ON bi.id = il.batch_item_id
    LEFT JOIN public.lesson_agreements la ON la.id = bi.lesson_agreement_id
    LEFT JOIN public.lesson_types by_agreement ON by_agreement.id = la.lesson_type_id
    LEFT JOIN public.profiles sp ON sp.user_id = i.student_user_id
    WHERE settings.id = true
      AND i.status IN ('issued', 'paid')
      AND COALESCE(i.period_start, i.issue_date) >= p_start_date
      AND COALESCE(i.period_start, i.issue_date) <= p_end_date
  ),
  invoices_json AS (
    SELECT json_agg(
      json_build_object(
        'invoice_id', ib.invoice_id,
        'line_id', ib.line_id,
        'stripe_invoice_id', ib.stripe_invoice_id,
        'status', ib.status,
        'amount_due_cents', ib.amount_due,
        'amount_paid_cents', ib.amount_paid,
        'amount_excl_btw_cents', ib.amount_excl_btw_cents,
        'btw_amount_cents', ib.btw_amount_cents,
        'currency', ib.currency,
        'period_start', ib.period_start,
        'paid_at', ib.paid_at,
        'hosted_invoice_url', ib.hosted_invoice_url,
        'age_category', ib.age_category,
        'cost_center', ib.cost_center,
        'lesson_type_id', ib.lesson_type_id,
        'lesson_type_name', ib.lesson_type_name,
        'lesson_type_icon', ib.lesson_type_icon,
        'lesson_type_color', ib.lesson_type_color,
        'student_user_id', ib.student_user_id,
        'student_name', COALESCE(
          NULLIF(TRIM(COALESCE(ib.student_first_name, '') || ' ' || COALESCE(ib.student_last_name, '')), ''),
          ib.student_email
        )
      )
      ORDER BY ib.period_start, ib.invoice_id, ib.sort_order, ib.line_id
    ) AS data
    FROM invoice_base ib
  ),
  summary AS (
    SELECT
      COUNT(DISTINCT invoice_id)::int AS invoice_count,
      COALESCE(SUM(excl_under_21_cents), 0)::int AS total_revenue_under_21_cents,
      COALESCE(SUM(excl_unknown_cents), 0)::int AS total_revenue_unknown_age_cents,
      COALESCE(SUM(excl_21_plus_cents), 0)::int AS total_revenue_21_plus_excl_cents,
      COALESCE(SUM(btw_amount_cents), 0)::int AS total_vat_cents,
      COALESCE(SUM(amount_due), 0)::int AS total_receivables_cents,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_paid ELSE 0 END), 0)::int AS total_paid_cents,
      COALESCE(SUM(CASE WHEN status <> 'paid' THEN amount_due ELSE 0 END), 0)::int AS total_open_cents
    FROM invoice_base
  ),
  by_cost_center AS (
    SELECT json_agg(
      json_build_object(
        'cost_center', cc,
        'invoice_count', invoice_count,
        'revenue_under_21_cents', revenue_under_21_cents,
        'revenue_unknown_age_cents', revenue_unknown_age_cents,
        'revenue_21_plus_excl_cents', revenue_21_plus_excl_cents,
        'vat_cents', vat_cents,
        'total_receivables_cents', total_receivables_cents
      )
      ORDER BY cc
    ) AS data
    FROM (
      SELECT
        cost_center AS cc,
        COUNT(DISTINCT invoice_id)::int AS invoice_count,
        COALESCE(SUM(excl_under_21_cents), 0)::int AS revenue_under_21_cents,
        COALESCE(SUM(excl_unknown_cents), 0)::int AS revenue_unknown_age_cents,
        COALESCE(SUM(excl_21_plus_cents), 0)::int AS revenue_21_plus_excl_cents,
        COALESCE(SUM(btw_amount_cents), 0)::int AS vat_cents,
        COALESCE(SUM(amount_due), 0)::int AS total_receivables_cents
      FROM invoice_base
      GROUP BY cost_center
    ) sub
  )
  SELECT json_build_object(
    'period', json_build_object('start', p_start_date, 'end', p_end_date),
    'summary', (SELECT row_to_json(summary.*) FROM summary),
    'invoices', COALESCE((SELECT data FROM invoices_json), '[]'::json),
    'by_cost_center', COALESCE((SELECT data FROM by_cost_center), '[]'::json)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_accounting_report(date, date) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_accounting_report(date, date) FROM anon;
