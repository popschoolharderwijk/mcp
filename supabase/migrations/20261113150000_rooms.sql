-- Rooms. Logged-in users can read rooms (a lesson can name any room).
-- Writes stay with admin and site admin. Anonymous roles have no access.

CREATE TYPE public.room_visibility AS ENUM ('public', 'internal', 'hidden');

CREATE TABLE public.rooms (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	name text NOT NULL,
	description text,
	notes text,
	image_url text,
	facilities text[] NOT NULL DEFAULT '{}',
	max_capacity integer NOT NULL DEFAULT 10 CHECK (max_capacity > 0),
	is_active boolean NOT NULL DEFAULT true,
	color text NOT NULL DEFAULT '#cccccc' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
	visibility public.room_visibility NOT NULL DEFAULT 'public',
	categories text[] NOT NULL DEFAULT '{}'
);

SELECT public.apply_audit_trail('public.rooms');

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms FORCE ROW LEVEL SECURITY;

CREATE POLICY rooms_select_authenticated
ON public.rooms
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY rooms_insert_admin
ON public.rooms
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() OR public.is_site_admin());

CREATE POLICY rooms_update_admin
ON public.rooms
FOR UPDATE
TO authenticated
USING (public.is_admin() OR public.is_site_admin())
WITH CHECK (public.is_admin() OR public.is_site_admin());

CREATE POLICY rooms_delete_admin
ON public.rooms
FOR DELETE
TO authenticated
USING (public.is_admin() OR public.is_site_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
