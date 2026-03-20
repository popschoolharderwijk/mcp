-- =============================================================================
-- SECURITY INTROSPECTION FUNCTIONS FOR CI TESTING
-- =============================================================================
-- These functions allow the test suite to verify RLS configuration and public API surface.
-- They query PostgreSQL system catalogs (and privilege metadata) and are restricted to service_role only.
--
-- SECURITY MODEL:
-- - SECURITY DEFINER: Runs with postgres privileges to access system catalogs
-- - SET search_path = pg_catalog, public: Trusted catalog resolution, no shadowing of built-ins
-- - SET row_security = off: Bypasses RLS for system catalog queries
-- - REVOKE FROM PUBLIC: No public access
-- - GRANT TO service_role: Only CI/backend can call these
--
-- WARNING: These functions expose schema metadata. Only grant to trusted roles.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- check_rls_enabled: RLS enabled on a public table (relrowsecurity)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_rls_enabled(p_table_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT COALESCE(
    (SELECT c.relrowsecurity
     FROM pg_catalog.pg_class c
     JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = p_table_name
       AND c.relkind IN ('r', 'p')),
    false
  );
$$;

-- -----------------------------------------------------------------------------
-- check_rls_forced: FORCE ROW LEVEL SECURITY on a public table (no owner bypass)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_rls_forced(p_table_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT COALESCE(
    (SELECT c.relforcerowsecurity
     FROM pg_catalog.pg_class c
     JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = p_table_name
       AND c.relkind IN ('r', 'p')),
    false
  );
$$;

-- -----------------------------------------------------------------------------
-- policy_exists: Check if a specific RLS policy exists
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.policy_exists(p_table_name TEXT, p_policy_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = p_table_name
      AND policyname = p_policy_name
  );
$$;

-- -----------------------------------------------------------------------------
-- get_table_policies: List all policies for a table
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_table_policies(p_table_name TEXT)
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT COALESCE(
    ARRAY_AGG(policyname ORDER BY policyname),
    ARRAY[]::TEXT[]
  )
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = p_table_name;
$$;

-- -----------------------------------------------------------------------------
-- function_exists: exact overload exists in public (p_regprocedure e.g. public.foo(text)).
-- No trim — callers must pass valid regprocedure spelling. Invalid text → false.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.function_exists(p_regprocedure TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
DECLARE
  v_oid oid;
BEGIN
  v_oid := p_regprocedure::regprocedure::oid;
  RETURN EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc p
    WHERE p.oid = v_oid
      AND p.pronamespace = 'public'::regnamespace
  );
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN false;
  WHEN undefined_function THEN
    RETURN false;
END;
$$;

-- -----------------------------------------------------------------------------
-- get_public_table_names: Get all public base table names for dynamic iteration
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_table_names()
RETURNS TABLE(table_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT t.table_name::TEXT
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'pg_%'
    AND t.table_name NOT LIKE '_%'
  ORDER BY t.table_name;
$$;

-- -----------------------------------------------------------------------------
-- get_public_views_security_mode: All public views + security_invoker flag
-- Filter client-side: security_invoker = false → definer semantics (RLS bypass risk)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_views_security_mode()
RETURNS TABLE(view_name TEXT, view_owner TEXT, security_invoker BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT
    c.relname::TEXT AS view_name,
    r.rolname::TEXT AS view_owner,
    COALESCE(
      (SELECT option_value::BOOLEAN
       FROM pg_options_to_table(c.reloptions)
       WHERE option_name = 'security_invoker'),
      false
    ) AS security_invoker
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_catalog.pg_roles r ON r.oid = c.relowner
  WHERE n.nspname = 'public'
    AND c.relkind = 'v'
  ORDER BY c.relname;
$$;

-- -----------------------------------------------------------------------------
-- authenticated_has_execute_on: whether role authenticated may EXECUTE (exact overload).
-- p_regprocedure must be valid Postgres regprocedure text (no trim — avoids masking typos).
-- Invalid regprocedure → false (EXCEPTION handlers below).
--
-- Semantics: for PostgREST-callable / SECURITY DEFINER RPCs, EXECUTE on authenticated is
-- direct attack surface. For RETURNS TRIGGER bodies, missing EXECUTE is defense-in-depth
-- (triggers run internally; session role does not need EXECUTE for the trigger to fire).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.authenticated_has_execute_on(p_regprocedure text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
BEGIN
  RETURN has_function_privilege(
    'authenticated'::regrole,
    p_regprocedure::regprocedure,
    'EXECUTE'
  );
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN false;
  WHEN undefined_function THEN
    RETURN false;
END;
$$;

-- -----------------------------------------------------------------------------
-- get_public_function_pronames: distinct pronames for normal SQL functions in public
-- Excludes: aggregates, window funcs, procedures, trigger bodies (RETURNS trigger)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_function_pronames()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT COALESCE(
    ARRAY_AGG(DISTINCT p.proname::TEXT ORDER BY p.proname::TEXT),
    ARRAY[]::TEXT[]
  )
  FROM pg_catalog.pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace
    AND p.prokind = 'f'
    AND p.prorettype <> 'pg_catalog.trigger'::regtype;
$$;

-- =============================================================================
-- SECURITY: Ownership and Access Control
-- =============================================================================

ALTER FUNCTION public.authenticated_has_execute_on(text) OWNER TO postgres;
ALTER FUNCTION public.check_rls_enabled(TEXT) OWNER TO postgres;
ALTER FUNCTION public.check_rls_forced(TEXT) OWNER TO postgres;
ALTER FUNCTION public.function_exists(TEXT) OWNER TO postgres;
ALTER FUNCTION public.get_public_function_pronames() OWNER TO postgres;
ALTER FUNCTION public.get_public_table_names() OWNER TO postgres;
ALTER FUNCTION public.get_public_views_security_mode() OWNER TO postgres;
ALTER FUNCTION public.get_table_policies(TEXT) OWNER TO postgres;
ALTER FUNCTION public.policy_exists(TEXT, TEXT) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.authenticated_has_execute_on(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_rls_enabled(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_rls_forced(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.function_exists(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_function_pronames() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_table_names() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_views_security_mode() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_table_policies(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.policy_exists(TEXT, TEXT) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.authenticated_has_execute_on(text) FROM anon;
REVOKE ALL ON FUNCTION public.check_rls_enabled(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.check_rls_forced(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.function_exists(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.get_public_function_pronames() FROM anon;
REVOKE ALL ON FUNCTION public.get_public_table_names() FROM anon;
REVOKE ALL ON FUNCTION public.get_public_views_security_mode() FROM anon;
REVOKE ALL ON FUNCTION public.get_table_policies(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.policy_exists(TEXT, TEXT) FROM anon;

REVOKE ALL ON FUNCTION public.authenticated_has_execute_on(text) FROM authenticated;
REVOKE ALL ON FUNCTION public.check_rls_enabled(TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.check_rls_forced(TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.function_exists(TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.get_public_function_pronames() FROM authenticated;
REVOKE ALL ON FUNCTION public.get_public_table_names() FROM authenticated;
REVOKE ALL ON FUNCTION public.get_public_views_security_mode() FROM authenticated;
REVOKE ALL ON FUNCTION public.get_table_policies(TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.policy_exists(TEXT, TEXT) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.authenticated_has_execute_on(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_rls_enabled(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_rls_forced(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.function_exists(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_public_function_pronames() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_public_table_names() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_public_views_security_mode() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_table_policies(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.policy_exists(TEXT, TEXT) TO service_role;

-- =============================================================================
-- END SECURITY INTROSPECTION
-- =============================================================================
