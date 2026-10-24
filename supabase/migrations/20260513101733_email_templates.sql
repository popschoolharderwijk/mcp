-- Consolidated email templates: table + initial template seeds.

-- ============================================================
-- Part 1: email_templates table
-- ============================================================
CREATE TABLE public.email_templates (
	event_key text PRIMARY KEY,
	subject text NOT NULL,
	body_markdown text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	created_by uuid,
	updated_by uuid
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates FORCE ROW LEVEL SECURITY;

CREATE POLICY email_templates_select ON public.email_templates
	FOR SELECT TO authenticated USING (true);

CREATE POLICY email_templates_insert_site_admin ON public.email_templates
	FOR INSERT TO authenticated WITH CHECK (is_site_admin());

CREATE POLICY email_templates_update_site_admin ON public.email_templates
	FOR UPDATE TO authenticated
	USING (is_site_admin())
	WITH CHECK (is_site_admin());

CREATE POLICY email_templates_delete_site_admin ON public.email_templates
	FOR DELETE TO authenticated USING (is_site_admin());

CREATE TRIGGER email_templates_set_audit_fields
	BEFORE INSERT OR UPDATE ON public.email_templates
	FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
REVOKE ALL ON TABLE public.email_templates FROM anon;

-- (Default email template rows in supabase/seeds/bootstrap.sql)
