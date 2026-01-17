-- ============================================================================
-- SUPABASE SEED.SQL (TRIGGER-PROOF)
-- ============================================================================
-- Purpose: Seed test users compatible with RLS and New User Bootstrap trigger
-- ============================================================================
-- Note: This file assumes `auth.users` trigger automatically creates
--       profiles and user_roles for new users.
-- ============================================================================

-- ============================================================================
-- 1️⃣ AUTH USERS
-- ============================================================================
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'student1@test.local', 'password', now()),
  ('11111111-1111-1111-1111-222222222222', 'student2@test.local', 'password', now()),
  ('22222222-2222-2222-2222-222222222222', 'teacher1@test.local', 'password', now()),
  ('22222222-2222-2222-2222-333333333333', 'teacher2@test.local', 'password', now()),
  ('33333333-3333-3333-3333-333333333333', 'staff1@test.local', 'password', now()),
  ('44444444-4444-4444-4444-444444444444', 'admin@test.local', 'password', now()),
  ('55555555-5555-5555-5555-555555555555', 'siteadmin@test.local', 'password', now());

-- ============================================================================
-- 2️⃣ UPDATE PROFILES (SET DISPLAY NAMES)
-- ============================================================================
UPDATE profiles
SET display_name = 'Student One'
WHERE user_id = '11111111-1111-1111-1111-111111111111';

UPDATE profiles
SET display_name = 'Student Two'
WHERE user_id = '11111111-1111-1111-1111-222222222222';

UPDATE profiles
SET display_name = 'Teacher One'
WHERE user_id = '22222222-2222-2222-2222-222222222222';

UPDATE profiles
SET display_name = 'Teacher Two'
WHERE user_id = '22222222-2222-2222-2222-333333333333';

UPDATE profiles
SET display_name = 'Staff One'
WHERE user_id = '33333333-3333-3333-3333-333333333333';

UPDATE profiles
SET display_name = 'Admin One'
WHERE user_id = '44444444-4444-4444-4444-444444444444';

UPDATE profiles
SET display_name = 'Site Admin'
WHERE user_id = '55555555-5555-5555-5555-555555555555';

-- ============================================================================
-- 3️⃣ UPDATE ROLES (TRIGGER CREATES ALL AS 'student')
-- ============================================================================
-- The handle_new_user trigger assigns 'student' role to all new users.
-- We update the roles here to match our test user expectations.
UPDATE user_roles SET role = 'teacher'
WHERE user_id IN (
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-333333333333'
);

UPDATE user_roles SET role = 'staff'
WHERE user_id = '33333333-3333-3333-3333-333333333333';

UPDATE user_roles SET role = 'admin'
WHERE user_id = '44444444-4444-4444-4444-444444444444';

UPDATE user_roles SET role = 'site_admin'
WHERE user_id = '55555555-5555-5555-5555-555555555555';

-- ============================================================================
-- 4️⃣ TEACHER-STUDENT LINKS
-- ============================================================================
INSERT INTO teacher_students (teacher_id, student_id)
VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-222222222222'),
  ('22222222-2222-2222-2222-333333333333', '11111111-1111-1111-1111-222222222222')
ON CONFLICT (teacher_id, student_id) DO NOTHING;

-- ============================================================================
-- 5️⃣ NOTES
-- ============================================================================
-- 1. Do NOT insert directly into profiles or user_roles; triggers handle that.
-- 2. Display names are updated via UPDATE statements above.
-- 3. Roles are updated after trigger creates default 'student' role.
-- 4. Teacher-student links are inserted here; duplicates are ignored via ON CONFLICT.
-- 5. Run `supabase db reset` before seeding to ensure a clean database.

