-- =============================================================================
-- RLS OVERVIEW FUNCTION FOR SITE_ADMIN
-- =============================================================================
-- This function allows site_admin users to view all RLS policies in the database.
-- It queries the pg_policies system catalog and returns detailed policy information.
--
-- SECURITY MODEL:
-- - SECURITY DEFINER: Runs with postgres privileges to access system catalogs
-- - SET search_path: Prevents search_path injection attacks
-- - SET row_security = off: Bypasses RLS for system catalog queries
-- - Internal check: Only site_admin can call this function
-- - REVOKE FROM PUBLIC: No public access
-- - GRANT TO authenticated: But function checks internally for site_admin
--
-- WARNING: This function exposes schema metadata. Only site_admin can access it.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- get_rls_policies: Get all RLS policies with detailed information
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_rls_policies()
RETURNS TABLE (
  table_name TEXT,
  policy_name TEXT,
  command TEXT,
  roles TEXT,
  using_expression TEXT,
  with_check_expression TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  -- Check if the current user is site_admin
  IF NOT public.is_site_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Only site_admin can view RLS policies.';
  END IF;

  -- Return all policies from pg_policies
  -- Note: pg_policies.qual and pg_policies.with_check are already text columns
  RETURN QUERY
  SELECT
    p.tablename::TEXT AS table_name,
    p.policyname::TEXT AS policy_name,
    p.cmd::TEXT AS command,
    COALESCE(p.roles::TEXT, '') AS roles,
    COALESCE(p.qual::TEXT, '') AS using_expression,
    COALESCE(p.with_check::TEXT, '') AS with_check_expression
  FROM pg_policies p
  WHERE p.schemaname = 'public'
  ORDER BY p.tablename, p.policyname;
END;
$$;

-- =============================================================================
-- SECURITY: Ownership and Access Control
-- =============================================================================

-- Set explicit ownership
ALTER FUNCTION public.get_rls_policies() OWNER TO postgres;

-- Remove all public access
REVOKE ALL ON FUNCTION public.get_rls_policies() FROM PUBLIC;

-- Explicitly revoke from anon
REVOKE ALL ON FUNCTION public.get_rls_policies() FROM anon;

-- Grant access to authenticated users (function checks internally for site_admin)
GRANT EXECUTE ON FUNCTION public.get_rls_policies() TO authenticated;

-- -----------------------------------------------------------------------------
-- get_app_role_enum_values: Get all values from app_role enum
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_app_role_enum_values()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT ARRAY_AGG(enumlabel ORDER BY enumsortorder)
  FROM pg_enum
  WHERE enumtypid = 'public.app_role'::regtype;
$$;

-- Set explicit ownership
ALTER FUNCTION public.get_app_role_enum_values() OWNER TO postgres;

-- Remove all public access
REVOKE ALL ON FUNCTION public.get_app_role_enum_values() FROM PUBLIC;

-- Explicitly revoke from anon
REVOKE ALL ON FUNCTION public.get_app_role_enum_values() FROM anon;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_app_role_enum_values() TO authenticated;

-- =============================================================================
-- END RLS OVERVIEW FUNCTION
-- =============================================================================
