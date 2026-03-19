-- =============================================================================
-- PROJECTS MODULE: project_domains → project_labels → projects
-- Runs before agenda_events so the enum exists when agenda_events is created.
-- =============================================================================

-- Enum for agenda_events.source_type (used by agenda_events table in next migration)
CREATE TYPE public.agenda_event_source_type AS ENUM ('manual', 'lesson_agreement', 'project');

-- 1. project_domains
CREATE TABLE public.project_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (trim(name) <> ''),
  is_active boolean NOT NULL DEFAULT true
);

-- Case-insensitive unique name
CREATE UNIQUE INDEX idx_project_domains_name_lower ON public.project_domains (lower(name));

-- 2. project_labels
CREATE TABLE public.project_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES public.project_domains(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (trim(name) <> ''),
  is_active boolean NOT NULL DEFAULT true
);

-- Case-insensitive unique label per domain
CREATE UNIQUE INDEX idx_project_labels_domain_name_lower ON public.project_labels (domain_id, lower(name));
CREATE INDEX idx_project_labels_domain_id ON public.project_labels(domain_id);

-- 3. projects
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_id uuid NOT NULL REFERENCES public.project_labels(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (trim(name) <> ''),
  description text,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id),
  cost_center text,
  is_active boolean NOT NULL DEFAULT true
);

CREATE INDEX idx_projects_label_id ON public.projects(label_id);
CREATE INDEX idx_projects_owner_user_id ON public.projects(owner_user_id);

-- =============================================================================
-- AUDIT TRAIL: add audit columns and triggers via helper
-- =============================================================================
SELECT public.apply_audit_trail('public.project_domains');
SELECT public.apply_audit_trail('public.project_labels');
SELECT public.apply_audit_trail('public.projects');

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.project_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- project_domains policies
CREATE POLICY project_domains_select_all ON public.project_domains
  FOR SELECT TO authenticated USING (true);

CREATE POLICY project_domains_insert_admin ON public.project_domains
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.is_site_admin());

CREATE POLICY project_domains_update_admin ON public.project_domains
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_site_admin())
  WITH CHECK (public.is_admin() OR public.is_site_admin());

CREATE POLICY project_domains_delete_admin ON public.project_domains
  FOR DELETE TO authenticated
  USING (public.is_admin() OR public.is_site_admin());

-- project_labels policies
CREATE POLICY project_labels_select_all ON public.project_labels
  FOR SELECT TO authenticated USING (true);

CREATE POLICY project_labels_insert_admin ON public.project_labels
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.is_site_admin());

CREATE POLICY project_labels_update_admin ON public.project_labels
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_site_admin())
  WITH CHECK (public.is_admin() OR public.is_site_admin());

CREATE POLICY project_labels_delete_admin ON public.project_labels
  FOR DELETE TO authenticated
  USING (public.is_admin() OR public.is_site_admin());

-- projects policies (single SELECT policy: admin/site_admin see all, others only own rows — avoids multiple permissive SELECT policies)
CREATE POLICY projects_select ON public.projects
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR public.is_site_admin()
    OR owner_user_id = public.current_user_id()
  );

CREATE POLICY projects_insert_admin ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.is_site_admin());

CREATE POLICY projects_update_admin ON public.projects
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_site_admin())
  WITH CHECK (public.is_admin() OR public.is_site_admin());

CREATE POLICY projects_delete_admin ON public.projects
  FOR DELETE TO authenticated
  USING (public.is_admin() OR public.is_site_admin());

-- -----------------------------------------------------------------------------
-- GRANT (table-level; RLS remains the security boundary)
-- -----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_domains TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_labels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
