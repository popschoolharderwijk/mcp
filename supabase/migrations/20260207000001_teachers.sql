-- =============================================================================
-- TEACHERS TABLE
-- =============================================================================
-- This migration creates:
-- 1. teachers table for managing teacher records
-- 2. RLS policies for the table
-- 3. Triggers for data integrity
--
-- Teachers are linked to auth.users via user_id.
-- =============================================================================

-- =============================================================================
-- SECTION 1: TYPES
-- =============================================================================
-- No custom types needed for this migration

-- =============================================================================
-- SECTION 2: TABLES
-- =============================================================================

-- Teachers table - links users to teacher records
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON public.teachers(user_id);

-- =============================================================================
-- SECTION 3: ENABLE RLS
-- =============================================================================

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
-- FORCE RLS: Even table owner / service_role is subject to RLS policies.
-- This is a security best practice but means admin scripts must use service_role
-- or bypass RLS explicitly. Many teams omit FORCE for operational flexibility.
ALTER TABLE public.teachers FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- SECTION 4: HELPER FUNCTIONS
-- =============================================================================

-- Helper function to check if a user is a teacher
-- Uses SECURITY DEFINER to bypass RLS on teachers table
CREATE OR REPLACE FUNCTION public.is_teacher(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teachers
    WHERE user_id = _user_id
  );
$$;

-- Revoke public access, grant only to authenticated users
REVOKE ALL ON FUNCTION public.is_teacher(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_teacher(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_teacher(UUID) TO authenticated;
ALTER FUNCTION public.is_teacher(UUID) OWNER TO postgres;

-- Helper function to get teacher ID for a user
-- Uses SECURITY DEFINER to bypass RLS on teachers table
CREATE OR REPLACE FUNCTION public.get_teacher_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT id
  FROM public.teachers
  WHERE user_id = _user_id
  LIMIT 1;
$$;

-- Revoke public access, grant only to authenticated users
REVOKE ALL ON FUNCTION public.get_teacher_id(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_teacher_id(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_teacher_id(UUID) TO authenticated;
ALTER FUNCTION public.get_teacher_id(UUID) OWNER TO postgres;

-- =============================================================================
-- SECTION 5: RLS POLICIES
-- =============================================================================

-- Teachers can view their own record
CREATE POLICY teachers_select_own
ON public.teachers FOR SELECT TO authenticated
USING (user_id = (select auth.uid()));

-- Staff, admins and site_admins can view all teachers
CREATE POLICY teachers_select_staff
ON public.teachers FOR SELECT TO authenticated
USING (
  public.is_privileged((select auth.uid()))
);

-- Admins and site_admins can insert teachers
CREATE POLICY teachers_insert_admin
ON public.teachers FOR INSERT TO authenticated
WITH CHECK (public.is_admin((select auth.uid())) OR public.is_site_admin((select auth.uid())));

-- Admins and site_admins can update teachers
CREATE POLICY teachers_update_admin
ON public.teachers FOR UPDATE TO authenticated
USING (public.is_admin((select auth.uid())) OR public.is_site_admin((select auth.uid())))
WITH CHECK (public.is_admin((select auth.uid())) OR public.is_site_admin((select auth.uid())));

-- Admins and site_admins can delete teachers
CREATE POLICY teachers_delete_admin
ON public.teachers FOR DELETE TO authenticated
USING (public.is_admin((select auth.uid())) OR public.is_site_admin((select auth.uid())));

-- =============================================================================
-- SECTION 6: TRIGGERS
-- =============================================================================

-- Reuse existing update_updated_at_column function from baseline
CREATE TRIGGER update_teachers_updated_at
BEFORE UPDATE ON public.teachers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- SECTION 7: PERMISSIONS
-- =============================================================================

-- GRANT gives table-level permissions, but RLS policies (above) are what
-- actually control access. GRANT is required for RLS to work, but RLS is the
-- security boundary. Without matching RLS policies, GRANT alone does NOT grant access.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;

-- =============================================================================
-- END OF TEACHERS MIGRATION
-- =============================================================================
