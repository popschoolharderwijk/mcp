
-- ============================================================
-- Accounting: accounting_settings table
-- ============================================================
CREATE TABLE public.accounting_settings (
  id boolean PRIMARY KEY DEFAULT true,
  journal_code_memoriaal text NOT NULL DEFAULT '90',
  journal_code_bank text NOT NULL DEFAULT '20',
  account_debiteuren text NOT NULL DEFAULT '1300',
  account_omzet_under_21 text NOT NULL DEFAULT '8000',
  account_omzet_21_plus text NOT NULL DEFAULT '8010',
  account_btw_21 text NOT NULL DEFAULT '1500',
  account_bank_stripe text NOT NULL DEFAULT '1100',
  btw_code_21 text NOT NULL DEFAULT 'VH',
  btw_code_exempt text NOT NULL DEFAULT '0',
  currency text NOT NULL DEFAULT 'EUR',
  school_year_start_month integer NOT NULL DEFAULT 8,
  description_template text NOT NULL DEFAULT 'Lesgeld {periode} - {leerling}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  CONSTRAINT accounting_settings_singleton CHECK (id = true),
  CONSTRAINT accounting_settings_month_valid CHECK (school_year_start_month BETWEEN 1 AND 12)
);

-- Grants (admin/site_admin via RLS only)
GRANT SELECT ON public.accounting_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.accounting_settings TO authenticated;
GRANT ALL ON public.accounting_settings TO service_role;
REVOKE ALL ON TABLE public.accounting_settings FROM anon;

ALTER TABLE public.accounting_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_settings FORCE ROW LEVEL SECURITY;

-- Single PERMISSIVE policy per command, consolidated
CREATE POLICY accounting_settings_select ON public.accounting_settings
  FOR SELECT TO authenticated
  USING (is_privileged());

CREATE POLICY accounting_settings_insert_admin ON public.accounting_settings
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR is_site_admin());

CREATE POLICY accounting_settings_update_admin ON public.accounting_settings
  FOR UPDATE TO authenticated
  USING (is_admin() OR is_site_admin())
  WITH CHECK (is_admin() OR is_site_admin());

CREATE POLICY accounting_settings_delete_admin ON public.accounting_settings
  FOR DELETE TO authenticated
  USING (is_admin() OR is_site_admin());

-- Audit fields trigger
CREATE TRIGGER trg_audit_accounting_settings
  BEFORE INSERT OR UPDATE ON public.accounting_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

-- (Singleton row is seeded in supabase/seeds/bootstrap.sql)
