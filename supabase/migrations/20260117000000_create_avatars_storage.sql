-- =============================================================================
-- STORAGE: AVATARS BUCKET + POLICIES
-- =============================================================================
-- File path format: {user_id}.{ext} (e.g., abc-def-123.png)
-- Using consistent filename allows overwriting previous avatar (no storage leak)
--
-- SELECT is required for Storage upsert/delete (API checks visibility first).
-- Policies only expose objects whose name starts with the caller's user id
-- (or any avatar for privileged users). Anon still has no SELECT; listing
-- another user's object by random sentinel name stays empty (lint 0025).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
	'avatars',
	'avatars',
	true,
	5242880,
	ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
	public = excluded.public,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

CREATE POLICY "Users can select own avatar"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND name LIKE public.current_user_id()::text || '.%'
);

CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND name LIKE public.current_user_id()::text || '.%'
);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND name LIKE public.current_user_id()::text || '.%'
)
WITH CHECK (
  bucket_id = 'avatars'
  AND name LIKE public.current_user_id()::text || '.%'
);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND name LIKE public.current_user_id()::text || '.%'
);

CREATE POLICY "Privileged can select avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars' AND public.is_privileged());

CREATE POLICY "Privileged can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND public.is_privileged());

CREATE POLICY "Privileged can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND public.is_privileged())
WITH CHECK (bucket_id = 'avatars' AND public.is_privileged());

CREATE POLICY "Privileged can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND public.is_privileged());
