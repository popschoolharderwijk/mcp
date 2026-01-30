-- =============================================================================
-- ALLOW ADMINS TO INSERT, UPDATE AND DELETE USER ROLES
-- =============================================================================
-- This migration allows admins and site_admins to manage user roles with restrictions:
--
-- ADMINS:
-- - Can assign roles to new users (INSERT), but NOT site_admin roles
-- - Can modify roles of existing users (UPDATE), but NOT site_admin roles
-- - Can delete roles (DELETE), but NOT site_admin roles
-- - Cannot modify their own role
--
-- SITE_ADMINS:
-- - Can do everything (assign, modify, delete any role)
-- - Cannot modify their own role
--
-- Note: Profiles are automatically created via handle_new_user() trigger when
-- auth.users is created. This policy only handles role assignment.
--
-- Note: PRIMARY KEY on user_id ensures only one role per user.
-- =============================================================================

-- Drop the old site_admin-only UPDATE policy (replaced by roles_update_admin)
DROP POLICY IF EXISTS roles_update_site_admin ON public.user_roles;

-- Allow admins to insert roles (but NOT site_admin)
-- Allow site_admins to insert any role
CREATE POLICY roles_insert_admin
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  (
    public.is_admin((select auth.uid()))
    AND role != 'site_admin'  -- Admins cannot assign site_admin
  )
  OR public.is_site_admin((select auth.uid()))  -- Site_admins can assign any role
);

-- Allow admins to update roles (but NOT site_admin roles and not their own)
-- Allow site_admins to update any role (but not their own)
-- Note: In USING, 'role' refers to OLD.role. In WITH CHECK, 'role' refers to NEW.role.
CREATE POLICY roles_update_admin
ON public.user_roles FOR UPDATE TO authenticated
USING (
  (
    (
      public.is_admin((select auth.uid()))
      AND role != 'site_admin'  -- Admins cannot modify users with site_admin role (OLD.role)
    )
    OR public.is_site_admin((select auth.uid()))  -- Site_admins can modify any role
  )
  AND user_id != (select auth.uid())  -- Cannot modify own role
)
WITH CHECK (
  (
    (
      public.is_admin((select auth.uid()))
      AND role != 'site_admin'  -- Admins cannot set role to site_admin (NEW.role)
    )
    OR public.is_site_admin((select auth.uid()))  -- Site_admins can set any role
  )
  AND user_id != (select auth.uid())  -- Cannot modify own role
);

-- Allow admins to delete roles (but NOT site_admin roles)
-- Allow site_admins to delete any role
CREATE POLICY roles_delete_admin
ON public.user_roles FOR DELETE TO authenticated
USING (
  (
    public.is_admin((select auth.uid()))
    AND role != 'site_admin'  -- Admins cannot delete site_admin roles
  )
  OR public.is_site_admin((select auth.uid()))  -- Site_admins can delete any role
);

-- Grant INSERT, UPDATE, DELETE permissions on user_roles table
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
