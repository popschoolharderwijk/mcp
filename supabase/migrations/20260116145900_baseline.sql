-- =============================================================================
-- COMPLETE DATABASE SETUP WITH SECURITY FIXES
-- =============================================================================
-- This file combines the initial database setup with all security hardening
-- fixes. Use this as a single source of truth for the database schema.
--
-- Role model: One user = One role (enforced by PRIMARY KEY on user_id)
-- =============================================================================

-- =============================================================================
-- SECTION 1: TYPES
-- =============================================================================

DROP TYPE IF EXISTS public.app_role CASCADE;

CREATE TYPE public.app_role AS ENUM (
  'site_admin',
  'admin',
  'staff'
);

-- =============================================================================
-- SECTION 1b: AUDIT TRAIL FUNCTIONS
-- =============================================================================
-- Reusable audit fields trigger and helper for tables with:
-- created_at, updated_at, created_by, updated_by
-- Defined early so apply_audit_trail() can be used in table definitions.

CREATE OR REPLACE FUNCTION public.set_audit_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();

  IF TG_OP = 'INSERT' THEN
    IF NEW.created_at IS NULL THEN
      NEW.created_at := now();
    END IF;
    IF NEW.created_by IS NULL AND v_uid IS NOT NULL THEN
      NEW.created_by := v_uid;
    END IF;
    NEW.updated_at := COALESCE(NEW.updated_at, NEW.created_at);
    NEW.updated_by := COALESCE(NEW.updated_by, NEW.created_by);

  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
    IF v_uid IS NOT NULL THEN
      NEW.updated_by := v_uid;
    END IF;

    -- Immutability guards
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'created_at is immutable';
    END IF;
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'created_by is immutable';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Helper function to add audit columns, FK indexes on created_by/updated_by, and trigger
CREATE OR REPLACE FUNCTION public.apply_audit_trail(p_table regclass)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_schema text;
  v_rel text;
BEGIN
  SELECT n.nspname, c.relname
  INTO v_schema, v_rel
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE c.oid = p_table::oid;

  IF v_schema IS NULL OR v_rel IS NULL THEN
    RAISE EXCEPTION 'apply_audit_trail: relation % not found', p_table;
  END IF;

  EXECUTE format('
    ALTER TABLE %I.%I
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id)
  ', v_schema, v_rel);

  -- FK indexes (auth.users): avoids unindexed_foreign_keys database linter noise
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON %I.%I (created_by)',
    'idx_' || v_rel || '_created_by',
    v_schema,
    v_rel
  );
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON %I.%I (updated_by)',
    'idx_' || v_rel || '_updated_by',
    v_schema,
    v_rel
  );

  EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON %I.%I', v_rel, v_schema, v_rel);

  EXECUTE format('
    CREATE TRIGGER trg_audit_%I
    BEFORE INSERT OR UPDATE ON %I.%I
    FOR EACH ROW
    EXECUTE FUNCTION public.set_audit_fields()
  ', v_rel, v_schema, v_rel);
END;
$$;

REVOKE ALL ON FUNCTION public.set_audit_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_audit_fields() FROM anon;
REVOKE ALL ON FUNCTION public.apply_audit_trail(regclass) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_audit_trail(regclass) FROM anon;

-- =============================================================================
-- SECTION 1c: PHONE NUMBER VALIDATION (single source of truth for CHECK constraints)
-- =============================================================================
-- Change only the regex here to adjust rules for all columns that use this helper.
CREATE OR REPLACE FUNCTION public.is_valid_phone_number(p_phone text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT p_phone IS NULL OR p_phone ~ '^06[0-9]{8}$';
$$;

REVOKE ALL ON FUNCTION public.is_valid_phone_number(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_valid_phone_number(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_valid_phone_number(text) TO authenticated;
ALTER FUNCTION public.is_valid_phone_number(text) OWNER TO postgres;

-- =============================================================================
-- SECTION 2: TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT CHECK (public.is_valid_phone_number(phone_number)),
  avatar_url TEXT
);

-- Add audit columns to profiles
SELECT public.apply_audit_trail('public.profiles');

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles (role);

-- Add audit columns to user_roles
SELECT public.apply_audit_trail('public.user_roles');

-- =============================================================================
-- SECTION 3: ENABLE RLS
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- SECTION 3b: AUTH HELPER (single evaluation per statement, cleaner policies)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;

-- =============================================================================
-- SECTION 4: ROLE HELPER FUNCTIONS (HARDENED)
-- =============================================================================
-- _has_role: SECURITY DEFINER + row_security off — only for DEFINER helpers (e.g. can_*), never granted to authenticated.
-- is_*(): SECURITY INVOKER — EXISTS on user_roles under RLS. Use a single SELECT policy with
-- (own row OR is_privileged()); splitting into a second policy USING (is_privileged()) alone causes
-- stack depth errors (re-entrant RLS while evaluating is_privileged()).

-- Internal helper — do not call from clients; use is_site_admin(), is_admin(), etc. instead
CREATE OR REPLACE FUNCTION public._has_role(
  _user_id UUID,
  _role app_role
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_site_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = public.current_user_id()
      AND role = 'site_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = public.current_user_id()
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = public.current_user_id()
      AND role = 'staff'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_privileged()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = public.current_user_id()
      AND role IN ('staff', 'admin', 'site_admin')
  );
$$;

-- Revoke public access
REVOKE ALL ON FUNCTION
  public._has_role(UUID, app_role),
  public.is_site_admin(),
  public.is_admin(),
  public.is_staff(),
  public.is_privileged()
FROM PUBLIC;

-- Explicitly revoke from anon (Supabase's anon role doesn't inherit from PUBLIC revokes)
REVOKE ALL ON FUNCTION
  public._has_role(UUID, app_role),
  public.is_site_admin(),
  public.is_admin(),
  public.is_staff(),
  public.is_privileged()
FROM anon;

-- _has_role: internal only — never grant to authenticated (would leak role info for arbitrary user ids)
REVOKE ALL ON FUNCTION public._has_role(UUID, app_role) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.is_site_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_privileged() TO authenticated;

ALTER FUNCTION public._has_role(UUID, app_role) OWNER TO postgres;
ALTER FUNCTION public.is_site_admin() OWNER TO postgres;
ALTER FUNCTION public.is_admin() OWNER TO postgres;
ALTER FUNCTION public.is_staff() OWNER TO postgres;
ALTER FUNCTION public.is_privileged() OWNER TO postgres;

-- =============================================================================
-- SECTION 4b: AUTHORIZATION HELPER FUNCTIONS
-- =============================================================================
-- These functions centralize permission checks that are used by Edge Functions.
-- This keeps authorization logic in the database (single source of truth).

-- Check if the current session user may delete the given account (requester is always current_user_id(); no spoofing)
-- Rules:
-- - Self-deletion always allowed
-- - Admin and site_admin may delete any account
CREATE OR REPLACE FUNCTION public.can_delete_user(_target_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    public.current_user_id() = _target_id
    OR public._has_role(public.current_user_id(), 'admin')
    OR public._has_role(public.current_user_id(), 'site_admin');
$$;

-- Security: only authenticated users can call this
REVOKE ALL ON FUNCTION public.can_delete_user(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_delete_user(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_delete_user(UUID) TO authenticated;
ALTER FUNCTION public.can_delete_user(UUID) OWNER TO postgres;

-- =============================================================================
-- SECTION 5: RLS POLICIES - PROFILES
-- =============================================================================

-- Combined SELECT policy: users can view own profile, privileged users can view all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select'
  ) THEN
    CREATE POLICY profiles_select
    ON public.profiles FOR SELECT TO authenticated
    USING (
      public.current_user_id() = user_id
      OR public.is_privileged()
    );
  END IF;
END $$;

-- Combined UPDATE policy: users can update own profile, admins can update any profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_update'
  ) THEN
    CREATE POLICY profiles_update
    ON public.profiles FOR UPDATE TO authenticated
    USING (
      public.current_user_id() = user_id
      OR public.is_admin() OR public.is_site_admin()
    )
    WITH CHECK (
      public.current_user_id() = user_id
      OR public.is_admin() OR public.is_site_admin()
    );
  END IF;
END $$;

-- No INSERT policy on purpose: clients cannot INSERT into profiles; rows are created only by
-- public.handle_new_user() (trigger on auth.users). This is intentional, not an oversight.
-- No DELETE policy on purpose: profiles are removed via ON DELETE CASCADE from auth.users.

-- =============================================================================
-- SECTION 6: RLS POLICIES - USER_ROLES
-- =============================================================================
-- Role management permissions:
--
-- ADMINS:
-- - Can assign roles to new users (INSERT), but NOT site_admin roles, and NOT for own user_id
-- - Can modify roles of existing users (UPDATE), but NOT site_admin roles
-- - Can delete roles (DELETE), but NOT site_admin roles
-- - Cannot modify or delete their own role row
--
-- SITE_ADMINS:
-- - Can do everything (assign, modify, delete any role) for other users
-- - Cannot modify, delete, or INSERT their own role row
--
-- Note: PRIMARY KEY on user_id ensures only one role per user.

-- SELECT: one policy with OR — avoids RLS recursion (do not add a separate policy only USING (is_privileged())).
DO $$
BEGIN
  DROP POLICY IF EXISTS roles_select_own ON public.user_roles;
  DROP POLICY IF EXISTS roles_select_privileged ON public.user_roles;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'roles_select'
  ) THEN
    CREATE POLICY roles_select
    ON public.user_roles FOR SELECT TO authenticated
    USING (
      public.current_user_id() = user_id
      OR public.is_privileged()
    );
  END IF;
END $$;

-- Allow admins to insert roles (but NOT site_admin)
-- Allow site_admins to insert any role (never for own user_id — consistent with UPDATE/DELETE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'roles_insert_admin'
  ) THEN
    CREATE POLICY roles_insert_admin
    ON public.user_roles FOR INSERT TO authenticated
    WITH CHECK (
      (
        (
          public.is_admin()
          AND role != 'site_admin'  -- Admins cannot assign site_admin
        )
        OR public.is_site_admin()  -- Site_admins can assign any role
      )
      AND user_id != public.current_user_id()
    );
  END IF;
END $$;

-- Allow admins to update roles (but NOT site_admin roles and not their own)
-- Allow site_admins to update any role (but not their own)
-- Note: In USING, 'role' refers to OLD.role. In WITH CHECK, 'role' refers to NEW.role.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'roles_update_admin'
  ) THEN
    CREATE POLICY roles_update_admin
    ON public.user_roles FOR UPDATE TO authenticated
    USING (
      (
        (
          public.is_admin()
          AND role != 'site_admin'  -- Admins cannot modify users with site_admin role (OLD.role)
        )
        OR public.is_site_admin()  -- Site_admins can modify any role
      )
      AND user_id != public.current_user_id()  -- Cannot modify own role
    )
    WITH CHECK (
      (
        (
          public.is_admin()
          AND role != 'site_admin'  -- Admins cannot set role to site_admin (NEW.role)
        )
        OR public.is_site_admin()  -- Site_admins can set any role
      )
      AND user_id != public.current_user_id()  -- Cannot modify own role
    );
  END IF;
END $$;

-- Allow admins to delete roles (but NOT site_admin roles)
-- Allow site_admins to delete any role (not own row — consistent with UPDATE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'roles_delete_admin'
  ) THEN
    CREATE POLICY roles_delete_admin
    ON public.user_roles FOR DELETE TO authenticated
    USING (
      (
        (
          public.is_admin()
          AND role != 'site_admin'  -- Admins cannot delete site_admin roles
        )
        OR public.is_site_admin()  -- Site_admins can delete any role
      )
      AND user_id != public.current_user_id()
    );
  END IF;
END $$;

-- Grant appropriate permissions on tables
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- Defense in depth: ensure anon has no table privileges (RLS alone is not table GRANTs)
REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.user_roles FROM anon;

-- =============================================================================
-- SECTION 7: TRIGGERS
-- =============================================================================

-- user_id immutable
CREATE OR REPLACE FUNCTION public.prevent_user_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'user_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_user_id_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_user_id_change() FROM anon;

CREATE TRIGGER prevent_profiles_user_id_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_user_id_change();

-- email immutable (but allow internal auth trigger sync)
CREATE OR REPLACE FUNCTION public.prevent_profile_email_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    -- Single source of truth: profile email must always match auth.users (sync via handle_auth_user_email_update).
    IF NEW.email IS DISTINCT FROM (SELECT u.email FROM auth.users u WHERE u.id = NEW.user_id) THEN
      RAISE EXCEPTION 'profiles.email is read-only; it follows your auth email';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_profile_email_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_profile_email_change() FROM anon;

CREATE TRIGGER prevent_profiles_email_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_email_change();

-- =============================================================================
-- SECTION 8: NEW USER BOOTSTRAP
-- =============================================================================
-- Automatically creates a profile when a new user signs up via Supabase Auth.
-- Note: No role is assigned. Explicit roles (admin, staff) are
-- assigned manually by site_admin.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  -- use raw_user_meta_data.first_name and last_name (can be NULL) for atomic setting of profile name
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name')
  ON CONFLICT (user_id) DO NOTHING;

  -- No role is assigned here. Users without a role in user_roles are regular users.

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- sync email updates
CREATE OR REPLACE FUNCTION public.handle_auth_user_email_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles
    SET email = NEW.email
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_auth_user_email_update() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_auth_user_email_update() FROM anon;

CREATE TRIGGER on_auth_user_email_updated
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_auth_user_email_update();

-- =============================================================================
-- SECTION 9: SITE_ADMIN LOCKOUT PROTECTION
-- =============================================================================
-- Defense-in-depth protection to ensure at least one site_admin always exists.
--
-- PROTECTION LAYERS:
-- 1. RLS Policy (SECTION 6): site_admin cannot modify their own role via API
-- 2. Trigger (this section): prevents removal of the LAST site_admin at DB level
--
-- SCENARIOS BLOCKED BY THIS TRIGGER:
-- - Direct SQL: DELETE FROM auth.users WHERE id = <last_site_admin>
-- - Supabase Dashboard: Deleting user via UI
-- - Supabase Admin API: supabase.auth.admin.deleteUser()
-- - Any CASCADE delete from auth.users → user_roles
--
-- HOW IT WORKS WITH CASCADE DELETES:
-- PostgreSQL executes all CASCADE deletes within the SAME transaction.
-- When this trigger raises an exception, the ENTIRE transaction is rolled back:
--
--   DELETE FROM auth.users (last site_admin)
--       ↓ CASCADE (same transaction)
--   DELETE FROM auth.identities
--       ↓ CASCADE (same transaction)
--   DELETE FROM user_roles
--       ↓ BEFORE DELETE trigger
--   RAISE EXCEPTION → FULL ROLLBACK
--
-- Result: auth.users, auth.identities, AND user_roles all remain intact.
-- No "half-deleted" state is possible.
--
-- TO REMOVE A SITE_ADMIN:
-- 1. First promote another user to site_admin
-- 2. Then the original site_admin can be removed/demoted
--
-- FIRST SITE_ADMIN:
-- Must be created via direct database access (seed.sql or migration).

CREATE OR REPLACE FUNCTION public.prevent_last_site_admin_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  remaining_site_admins INTEGER;
BEGIN
  -- Only check when removing a site_admin role (DELETE or role change away from site_admin)
  IF OLD.role = 'site_admin' AND (TG_OP = 'DELETE' OR NEW.role != 'site_admin') THEN
    -- Count remaining site_admins (excluding the one being modified)
    SELECT COUNT(*) INTO remaining_site_admins
    FROM public.user_roles
    WHERE role = 'site_admin'
      AND user_id != OLD.user_id;

    IF remaining_site_admins = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last site_admin. Promote another user to site_admin first.';
    END IF;
  END IF;

  -- Return appropriate row based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_last_site_admin_removal() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_last_site_admin_removal() FROM anon;

-- Apply trigger to both UPDATE and DELETE operations
CREATE TRIGGER protect_last_site_admin
BEFORE UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_last_site_admin_removal();

-- =============================================================================
-- END OF DATABASE SETUP
-- =============================================================================
