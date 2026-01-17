-- ============================================================================
-- Function: run_as_user
-- Purpose: Execute SELECT queries as a specified user for RLS behavior testing
-- 
-- SECURITY WARNING:
--   This function is intended for CI/test environments ONLY.
--   Never use with unvalidated input in production.
--   Function owner must NOT be a superuser to maintain security boundaries.
--
-- Access Control:
--   - Callable ONLY by service_role (all other roles are revoked)
--   - Only SELECT statements are allowed
--   - Dangerous patterns are blocked as defense-in-depth
--
-- Parameters:
--   _user_id: UUID of the user to impersonate
--   _query:   SELECT statement to execute (other statements are rejected)
--
-- Returns:
--   JSONB array of result rows, or empty array if no results
-- ============================================================================
CREATE OR REPLACE FUNCTION public.run_as_user(
  _user_id UUID,
  _query TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result JSONB;
  normalized_query TEXT;
BEGIN
  -- Input validation: user_id
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'run_as_user: _user_id cannot be NULL';
  END IF;

  -- Input validation: query
  IF _query IS NULL OR trim(_query) = '' THEN
    RAISE EXCEPTION 'run_as_user: _query cannot be NULL or empty';
  END IF;

  -- Normalize query for pattern matching
  normalized_query := upper(trim(_query));

  -- STRICT: Only SELECT statements are allowed
  IF normalized_query !~* '^\s*SELECT\s' THEN
    RAISE EXCEPTION 'run_as_user: Only SELECT statements are allowed';
  END IF;

  -- Defense-in-depth: Block dangerous patterns even within SELECT
  IF normalized_query ~* '\b(INTO\s+|SET\s+|DO\s+\$|COPY\s+|PG_READ_FILE|PG_WRITE_FILE|LO_IMPORT|LO_EXPORT)\b' THEN
    RAISE EXCEPTION 'run_as_user: Query contains blocked pattern';
  END IF;

  -- Inject JWT claims to simulate the specified user
  -- This allows auth.uid() and auth.jwt() to return the impersonated user's data
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', _user_id::text,
      'role', 'authenticated',
      'aud', 'authenticated'
    )::text,
    true  -- local to transaction only
  );

  -- Execute the query and aggregate results as JSONB
  BEGIN
    EXECUTE format('SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (%s) t', _query)
    INTO result;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'run_as_user: Query execution failed - % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  END;

  RETURN result;
END;
$$;

-- Revoke all access from public roles - only service_role can call this
REVOKE ALL ON FUNCTION public.run_as_user(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_as_user(UUID, TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.run_as_user(UUID, TEXT) FROM anon;

-- Add function comment for documentation
COMMENT ON FUNCTION public.run_as_user(UUID, TEXT) IS
'CI/TEST ONLY: Executes SELECT queries as a specified user by simulating JWT claims.
Used for RLS behavior testing. Only SELECT statements are allowed.
Function owner must NOT be a superuser. Callable only by service_role.';