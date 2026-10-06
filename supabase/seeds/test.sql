-- =============================================================================
-- TEST SEED (RLS / CI only — not for production)
-- =============================================================================
-- Requires supabase/seeds/bootstrap.sql to run first (lesson types, etc.).
-- These users are seeded in auth.users for local/preview testing.
-- Password for all users: "password"
-- RLS policies rely on public.current_user_id() matching these values
-- =============================================================================

-- -----------------------------------------------------------------------------
-- UUID STRUCTURE
-- -----------------------------------------------------------------------------
-- UUID format: TTTTTTTT-IIII-0000-0000-000000000000
--   TTTTTTTT: Type prefix (first 8 hex digits)
--   IIII: Index (4 hex digits, 1-based, zero-padded)
--   Rest: 0000-0000-000000000000
--
-- Type prefixes:
--   10000000 = site_admin
--   20000000 = admin
--   30000000 = staff
--   40000000 = teacher
--   50000000 = student
--   60000000 = user (no role, no teacher, no student)
--   70000000 = project_domain
--   71000000 = project_label
--   72000000 = project
--   73000000 = lesson_group
--   74000000 = lesson_signup_request
--   75000000 = trial_lesson
--   76000000 = no_lesson_period
--   77000000 = announcement
--   78000000 = sepa_mandate
--   79000000 = direct_debit_batch
--   7a000000 = direct_debit_batch_item
--   7b000000 = invoice
--   7c000000 = invoice_line
--
-- Examples:
--   10000000-0001-0000-0000-000000000000 = site_admin, 1st
--   20000000-0001-0000-0000-000000000000 = admin, 1st
--   30000000-0020-0000-0000-000000000000 = staff, 20th
--   40000000-0005-0000-0000-000000000000 = teacher, 5th
--   50000000-0001-0000-0000-000000000000 = student, 1st
--   60000000-0001-0000-0000-000000000000 = user (no role), 1st
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- TEST USERS (UUID MAP)
-- -----------------------------------------------------------------------------
-- site_admin (1)
--   10000000-0001-0000-0000-000000000000
--
-- admins (2)
--   20000000-0001-0000-0000-000000000000
--   20000000-0002-0000-0000-000000000000
--
-- staff (5)
--   30000000-0001-0000-0000-000000000000
--   30000000-0002-0000-0000-000000000000
--   30000000-0003-0000-0000-000000000000
--   30000000-0004-0000-0000-000000000000
--   30000000-0005-0000-0000-000000000000
--
-- teachers (10)
--   40000000-0001-0000-0000-000000000000 (Teacher Alice - has students)
--   40000000-0002-0000-0000-000000000000 (Teacher Bob - has students)
--   40000000-0003-0000-0000-000000000000 (Teacher Charlie - has students)
--   40000000-0004-0000-0000-000000000000 (Teacher Diana - has students)
--   40000000-0005-0000-0000-000000000000 (Teacher Eve - has students, Bandcoaching)
--   40000000-0006-0000-0000-000000000000 (Teacher Frank - has students)
--   40000000-0007-0000-0000-000000000000 (Teacher Grace - has students)
--   40000000-0008-0000-0000-000000000000 (Teacher Henry - has students)
--   40000000-0009-0000-0000-000000000000 (Teacher Iris - has students)
--   40000000-0010-0000-0000-000000000000 (Teacher Jack - NO students)
--
-- students (60)
--   50000000-0001 t/m 50000000-0060
--
-- users without any role (10)
--   60000000-0001 t/m 60000000-0010
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  -- -------------------------------------------------------------------------
  -- Create a temporary table for new users
  -- -------------------------------------------------------------------------
  CREATE TEMP TABLE new_users (
    id UUID,
    email TEXT,
	first_name TEXT,
	last_name TEXT,
	phone_number TEXT
  );

  -- -------------------------------------------------------------------------
  -- INSERT USERS INTO TEMP TABLE
  -- -------------------------------------------------------------------------
  -- Logic: Insert all users with new UUID structure
  -- - 1 site_admin, 2 admins, 5 staff, 10 teachers, 60 students, 10 users (no role)
  -- - Total: 88 users
  -- -------------------------------------------------------------------------
  INSERT INTO new_users (id, email, first_name, last_name, phone_number)
  VALUES
    -- Site admin (1)
    (UUID '10000000-0001-0000-0000-000000000000', 'site-admin@test.nl', 'Jan-Willem', 'van der Berg', '0612345678'),

    -- Admins (2)
    (UUID '20000000-0001-0000-0000-000000000000', 'admin-one@test.nl', 'Sophie', 'de Vries', '0623456789'),
    (UUID '20000000-0002-0000-0000-000000000000', 'admin-two@test.nl', 'Maarten', 'van den Broek', NULL),

    -- Staff (5)
    (UUID '30000000-0001-0000-0000-000000000000', 'staff-one@test.nl', 'Lisa', 'Jansen', '0634567890'),
    (UUID '30000000-0002-0000-0000-000000000000', 'staff-two@test.nl', 'Thomas', 'Bakker', '0634567891'),
    (UUID '30000000-0003-0000-0000-000000000000', 'staff-three@test.nl', 'Emma', 'Visser', '0634567892'),
    (UUID '30000000-0004-0000-0000-000000000000', 'staff-four@test.nl', 'Daan', 'Smit', '0634567893'),
    (UUID '30000000-0005-0000-0000-000000000000', 'staff-five@test.nl', 'Anna', 'Meijer', '0634567894'),

    -- Teachers (10)
    (UUID '40000000-0001-0000-0000-000000000000', 'teacher-alice@test.nl', 'Alice', 'van Dijk', '0645678901'),
    (UUID '40000000-0002-0000-0000-000000000000', 'teacher-bob@test.nl', 'Bob', 'de Boer', NULL),
    (UUID '40000000-0003-0000-0000-000000000000', 'teacher-charlie@test.nl', 'Charlotte', 'Mulder', '0645678902'),
    (UUID '40000000-0004-0000-0000-000000000000', 'teacher-diana@test.nl', 'Diana', 'van der Laan', '0645678903'),
    (UUID '40000000-0005-0000-0000-000000000000', 'teacher-eve@test.nl', 'Eva', 'van den Berg', '0645678904'),
    (UUID '40000000-0006-0000-0000-000000000000', 'teacher-frank@test.nl', 'Frank', 'de Vries', '0645678905'),
    (UUID '40000000-0007-0000-0000-000000000000', 'teacher-grace@test.nl', 'Grace', 'van der Meer', '0645678906'),
    (UUID '40000000-0008-0000-0000-000000000000', 'teacher-henry@test.nl', 'Hendrik', 'Janssen', '0645678907'),
    (UUID '40000000-0009-0000-0000-000000000000', 'teacher-iris@test.nl', 'Iris', 'van Leeuwen', '0645678908'),
    (UUID '40000000-0010-0000-0000-000000000000', 'teacher-jack@test.nl', 'Jacques', 'van der Wal', '0645678909'),

    -- Students (60)
    (UUID '50000000-0001-0000-0000-000000000000', 'student-001@test.nl', 'Lucas', 'van der Berg', '0656789012'),
    (UUID '50000000-0002-0000-0000-000000000000', 'student-002@test.nl', 'Noah', 'de Jong', NULL),
    (UUID '50000000-0003-0000-0000-000000000000', 'student-003@test.nl', 'Sem', 'Bakker', '0656789013'),
    (UUID '50000000-0004-0000-0000-000000000000', 'student-004@test.nl', 'Daan', 'Visser', NULL),
    (UUID '50000000-0005-0000-0000-000000000000', 'student-005@test.nl', 'Finn', 'Smit', '0656789014'),
    (UUID '50000000-0006-0000-0000-000000000000', 'student-006@test.nl', 'Liam', 'Meijer', '0656789015'),
    (UUID '50000000-0007-0000-0000-000000000000', 'student-007@test.nl', 'Jesse', 'de Boer', '0656789016'),
    (UUID '50000000-0008-0000-0000-000000000000', 'student-008@test.nl', 'Milan', 'Mulder', '0656789017'),
    (UUID '50000000-0009-0000-0000-000000000000', 'student-009@test.nl', 'Luuk', 'de Vries', '0656789018'),
    (UUID '50000000-0010-0000-0000-000000000000', 'student-010@test.nl', 'Bram', 'van Dijk', '0656789019'),
    (UUID '50000000-0011-0000-0000-000000000000', 'student-011@test.nl', 'Thijs', 'Janssen', '0656789020'),
    (UUID '50000000-0012-0000-0000-000000000000', 'student-012@test.nl', 'Max', 'van Leeuwen', '0656789021'),
    (UUID '50000000-0013-0000-0000-000000000000', 'student-013@test.nl', 'Sam', 'Jansen', '0656789022'),
    (UUID '50000000-0014-0000-0000-000000000000', 'student-014@test.nl', 'Levi', 'van der Laan', '0656789023'),
    (UUID '50000000-0015-0000-0000-000000000000', 'student-015@test.nl', 'Mees', 'van den Berg', '0656789024'),
    (UUID '50000000-0016-0000-0000-000000000000', 'student-016@test.nl', 'James', 'van der Meer', '0656789025'),
    (UUID '50000000-0017-0000-0000-000000000000', 'student-017@test.nl', 'Adam', 'van der Wal', '0656789026'),
    (UUID '50000000-0018-0000-0000-000000000000', 'student-018@test.nl', 'Olivier', 'van den Broek', '0656789027'),
    (UUID '50000000-0019-0000-0000-000000000000', 'student-019@test.nl', 'Benjamin', 'Hendriks', '0656789028'),
    (UUID '50000000-0020-0000-0000-000000000000', 'student-020@test.nl', 'Noud', 'Willems', '0656789029'),
    (UUID '50000000-0021-0000-0000-000000000000', 'student-021@test.nl', 'Gijs', 'van der Ven', '0656789030'),
    (UUID '50000000-0022-0000-0000-000000000000', 'student-022@test.nl', 'Teun', 'van der Heijden', '0656789031'),
    (UUID '50000000-0023-0000-0000-000000000000', 'student-023@test.nl', 'Roan', 'van der Steen', '0656789032'),
    (UUID '50000000-0024-0000-0000-000000000000', 'student-024@test.nl', 'Cas', 'van der Velden', '0656789033'),
    (UUID '50000000-0025-0000-0000-000000000000', 'student-025@test.nl', 'Tijn', 'van der Horst', '0656789034'),
    (UUID '50000000-0026-0000-0000-000000000000', 'student-026@test.nl', 'Sep', 'van der Pol', '0656789035'),
    (UUID '50000000-0027-0000-0000-000000000000', 'student-027@test.nl', 'Boaz', 'van der Linden', '0656789036'),
    (UUID '50000000-0028-0000-0000-000000000000', 'student-028@test.nl', 'Julian', 'van der Zanden', '0656789037'),
    (UUID '50000000-0029-0000-0000-000000000000', 'student-029@test.nl', 'Hugo', 'van der Schaaf', '0656789038'),
    (UUID '50000000-0030-0000-0000-000000000000', 'student-030@test.nl', 'Ruben', 'van der Schoot', '0656789039'),
    (UUID '50000000-0031-0000-0000-000000000000', 'student-031@test.nl', 'Sophie', 'van der Stelt', '0656789040'),
    (UUID '50000000-0032-0000-0000-000000000000', 'student-032@test.nl', 'Julia', 'van der Veen', '0656789041'),
    (UUID '50000000-0033-0000-0000-000000000000', 'student-033@test.nl', 'Emma', 'van der Weide', '0656789042'),
    (UUID '50000000-0034-0000-0000-000000000000', 'student-034@test.nl', 'Mila', 'van der Woude', '0656789043'),
    (UUID '50000000-0035-0000-0000-000000000000', 'student-035@test.nl', 'Tess', 'van der Zee', '0656789044'),
    (UUID '50000000-0036-0000-0000-000000000000', 'student-036@test.nl', 'Sara', 'van der Zwet', '0656789045'),
    (UUID '50000000-0037-0000-0000-000000000000', 'student-037@test.nl', 'Eva', 'van der Zwol', '0656789046'),
    (UUID '50000000-0038-0000-0000-000000000000', 'student-038@test.nl', 'Nora', 'van der Zwart', '0656789047'),
    (UUID '50000000-0039-0000-0000-000000000000', 'student-039@test.nl', 'Lotte', 'van der Zwaan', '0656789048'),
    (UUID '50000000-0040-0000-0000-000000000000', 'student-040@test.nl', 'Noor', 'van der Zwan', '0656789049'),
    (UUID '50000000-0041-0000-0000-000000000000', 'student-041@test.nl', 'Liv', 'van der Zwarte', '0656789050'),
    (UUID '50000000-0042-0000-0000-000000000000', 'student-042@test.nl', 'Saar', 'van der Zwartenberg', '0656789051'),
    (UUID '50000000-0043-0000-0000-000000000000', 'student-043@test.nl', 'Roos', 'van der Zwartewaal', '0656789052'),
    (UUID '50000000-0044-0000-0000-000000000000', 'student-044@test.nl', 'Fleur', 'van der Zwarteweg', '0656789053'),
    (UUID '50000000-0045-0000-0000-000000000000', 'student-045@test.nl', 'Ivy', 'van der Zwartewijk', '0656789054'),
    (UUID '50000000-0046-0000-0000-000000000000', 'student-046@test.nl', 'Lynn', 'van der Zwartewolde', '0656789055'),
    (UUID '50000000-0047-0000-0000-000000000000', 'student-047@test.nl', 'Yara', 'van der Zwartewoud', '0656789056'),
    (UUID '50000000-0048-0000-0000-000000000000', 'student-048@test.nl', 'Lieke', 'van der Zwartewout', '0656789057'),
    (UUID '50000000-0049-0000-0000-000000000000', 'student-049@test.nl', 'Fenna', 'van der Zwartewouw', '0656789058'),
    (UUID '50000000-0050-0000-0000-000000000000', 'student-050@test.nl', 'Lina', 'van der Zwartewouwers', '0656789059'),
    (UUID '50000000-0051-0000-0000-000000000000', 'student-051@test.nl', 'Anna', 'van der Zwartewouwershof', '0656789060'),
    (UUID '50000000-0052-0000-0000-000000000000', 'student-052@test.nl', 'Amber', 'van der Zwartewouwershofstraat', '0656789061'),
    (UUID '50000000-0053-0000-0000-000000000000', 'student-053@test.nl', 'Isabella', 'van der Zwartewouwershofstraatweg', '0656789062'),
    (UUID '50000000-0054-0000-0000-000000000000', 'student-054@test.nl', 'Eline', 'van der Zwartewouwershofstraatweglaan', '0656789063'),
    (UUID '50000000-0055-0000-0000-000000000000', 'student-055@test.nl', 'Luna', 'van der Zwartewouwershofstraatweglaanstraat', '0656789064'),
    (UUID '50000000-0056-0000-0000-000000000000', 'student-056@test.nl', 'Nina', 'Koning', '0656789065'),
    (UUID '50000000-0057-0000-0000-000000000000', 'student-057@test.nl', 'Mia', 'Vermeulen', '0656789066'),
    (UUID '50000000-0058-0000-0000-000000000000', 'student-058@test.nl', 'Lina', 'van den Berg', '0656789067'),
    (UUID '50000000-0059-0000-0000-000000000000', 'student-059@test.nl', 'Zoë', 'van den Broek', '0656789068'),
    (UUID '50000000-0060-0000-0000-000000000000', 'student-060@test.nl', 'Lara', 'van den Heuvel', '0656789069'),

    -- Users without any role (10)
    (UUID '60000000-0001-0000-0000-000000000000', 'user-001@test.nl', 'Koen', 'van der Berg', '0667890123'),
    (UUID '60000000-0002-0000-0000-000000000000', 'user-002@test.nl', 'Rik', 'de Jong', NULL),
    (UUID '60000000-0003-0000-0000-000000000000', 'user-003@test.nl', 'Tim', 'Bakker', '0667890124'),
    (UUID '60000000-0004-0000-0000-000000000000', 'user-004@test.nl', 'Sander', 'Visser', '0667890125'),
    (UUID '60000000-0005-0000-0000-000000000000', 'user-005@test.nl', 'Rick', 'Smit', NULL),
    (UUID '60000000-0006-0000-0000-000000000000', 'user-006@test.nl', 'Tom', 'Meijer', '0667890126'),
    (UUID '60000000-0007-0000-0000-000000000000', 'user-007@test.nl', 'Nick', 'de Boer', '0667890127'),
    (UUID '60000000-0008-0000-0000-000000000000', 'user-008@test.nl', 'Basles', 'Mulder', NULL),
    (UUID '60000000-0009-0000-0000-000000000000', 'user-009@test.nl', 'Stijn', 'de Vries', '0667890128'),
    (UUID '60000000-0010-0000-0000-000000000000', 'user-010@test.nl', 'Willem-Jan', 'van der Berg', '0667890129');

  -- -------------------------------------------------------------------------
  -- INSERT INTO AUTH.USERS
  -- -------------------------------------------------------------------------
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  SELECT
    id,
    '00000000-0000-0000-0000-000000000000',             -- instance_id
    'authenticated',                                    -- aud
    'authenticated',                                    -- role
    email,
    '$2a$10$9e974vMhtRxGA42trytRd.tC0yXzEhsKO0xN8lgoLjy5psvhsJTY.',  -- encrypted_password
    now(),                                              -- email_confirmed_at
    '{"provider":"email","providers":["email"]}',       -- raw_app_meta_data
	json_build_object(         							-- raw_user_meta_data
		'first_name', first_name,
		'last_name', last_name
    ),
    now(),                                              -- created_at
    now(),                                              -- updated_at
    '',                                                 -- confirmation_token
    '',                                                 -- email_change
    '',                                                 -- email_change_token_new
    ''                                                  -- recovery_token
  FROM new_users
  ON CONFLICT (id) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- INSERT INTO AUTH.IDENTITIES
  -- -------------------------------------------------------------------------
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    provider,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  )
  SELECT
    id,
    id,                       -- user_id = id
    email,                     -- provider_id
    'email',                   -- provider
    json_build_object(         -- identity_data
      'sub', id::text,
      'email', email,
      'email_verified', true,
      'provider', 'email'
    ),
    now(),                     -- last_sign_in_at
    now(),                     -- created_at
    now()                      -- updated_at
  FROM new_users
  ON CONFLICT (id) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- UPDATE PROFILES WITH FIRST_NAME, LAST_NAME, AND PHONE NUMBERS
  -- -------------------------------------------------------------------------
  -- The handle_new_user trigger created profiles with first_name/last_name from raw_user_meta_data,
  -- but we explicitly update them here to ensure they match the new_users table values exactly
  UPDATE public.profiles p
  SET
    first_name = nu.first_name,
    last_name = nu.last_name,
    phone_number = nu.phone_number
  FROM new_users nu
  WHERE p.user_id = nu.id;

  -- -------------------------------------------------------------------------
  -- Drop the temporary table
  -- -------------------------------------------------------------------------
  DROP TABLE IF EXISTS new_users;

END $$;

-- -----------------------------------------------------------------------------
-- USER ROLES (only for users with explicit roles)
-- -----------------------------------------------------------------------------
-- Logic:
-- - Only site_admin, admin, and staff have explicit roles in user_roles table
-- - Teachers are identified by the teachers table, not by a role
-- - Students are identified by the students table (auto-created via triggers)
-- - Users with UUID prefix 60000000 have no role, no teacher record, no student record
--   They are just regular authenticated users without any special permissions
-- -----------------------------------------------------------------------------
INSERT INTO public.user_roles (user_id, role) VALUES
  -- Site admin (1)
  ('10000000-0001-0000-0000-000000000000', 'site_admin'),

  -- Admins (2)
  ('20000000-0001-0000-0000-000000000000', 'admin'),
  ('20000000-0002-0000-0000-000000000000', 'admin'),

  -- Staff (5)
  ('30000000-0001-0000-0000-000000000000', 'staff'),
  ('30000000-0002-0000-0000-000000000000', 'staff'),
  ('30000000-0003-0000-0000-000000000000', 'staff'),
  ('30000000-0004-0000-0000-000000000000', 'staff'),
  ('30000000-0005-0000-0000-000000000000', 'staff')
ON CONFLICT (user_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- TEACHERS (for test users - teachers are identified by this table, not by role)
-- -----------------------------------------------------------------------------
-- Logic: Insert all 10 teachers
-- - Teachers 1-9 have students (will have lesson agreements)
-- - Teacher 10 (Jack) has NO students (no lesson agreements)
-- -----------------------------------------------------------------------------
INSERT INTO public.teachers (user_id)
SELECT user_id FROM public.profiles
WHERE email IN (
  'teacher-alice@test.nl',
  'teacher-bob@test.nl',
  'teacher-charlie@test.nl',
  'teacher-diana@test.nl',
  'teacher-eve@test.nl',
  'teacher-frank@test.nl',
  'teacher-grace@test.nl',
  'teacher-henry@test.nl',
  'teacher-iris@test.nl',
  'teacher-jack@test.nl'
)
ON CONFLICT (user_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- TEACHER LESSON TYPES (link teachers to lesson types they can teach)
-- -----------------------------------------------------------------------------
-- Logic: Distribute all 8 lesson types across 9 teachers (teacher 10 has no students)
-- - Each teacher can teach 1, 2, or 3 lesson types
-- - All 8 lesson types must be represented
-- - Some lesson types are taught by multiple teachers
--
-- Distribution:
--   Teacher 1 (Alice): Gitaar, Drums, Zang (3 types)
--   Teacher 2 (Bob): Bas, Keyboard (2 types)
--   Teacher 3 (Charlie): Saxofoon (1 type)
--   Teacher 4 (Diana): DJ / Beats (1 type)
--   Teacher 5 (Eve): Bandcoaching (1 type) - group lesson
--   Teacher 6 (Frank): Gitaar (1 type)
--   Teacher 7 (Grace): Drums (1 type)
--   Teacher 8 (Henry): Zang (1 type)
--   Teacher 9 (Iris): Bas (1 type)
--   Teacher 10 (Jack): No lesson types (no students)
--
-- Result: All 8 types covered, some by multiple teachers
-- -----------------------------------------------------------------------------
INSERT INTO public.teacher_lesson_types (teacher_user_id, lesson_type_id)
SELECT
  t.user_id AS teacher_user_id,
  lt.id AS lesson_type_id
FROM (VALUES
  -- Teacher 1 (Alice): 3 types
  ('teacher-alice@test.nl', 'Gitaarles'),
  ('teacher-alice@test.nl', 'Drumles'),
  ('teacher-alice@test.nl', 'Zangles'),

  -- Teacher 2 (Bob): 2 types
  ('teacher-bob@test.nl', 'Basles'),
  ('teacher-bob@test.nl', 'Keyboardles'),

  -- Teacher 3 (Charlie): 1 type
  ('teacher-charlie@test.nl', 'Saxofoonles'),

  -- Teacher 4 (Diana): 1 type
  ('teacher-diana@test.nl', 'DJ / Beats'),

  -- Teacher 5 (Eve): 1 type (group lesson)
  ('teacher-eve@test.nl', 'Bandcoaching'),

  -- Teacher 6 (Frank): 1 type
  ('teacher-frank@test.nl', 'Gitaarles'),

  -- Teacher 7 (Grace): 1 type
  ('teacher-grace@test.nl', 'Drumles'),

  -- Teacher 8 (Henry): 1 type
  ('teacher-henry@test.nl', 'Zangles'),

  -- Teacher 9 (Iris): 1 type
  ('teacher-iris@test.nl', 'Basles')

  -- Teacher 10 (Jack): No lesson types (no students)
) AS teacher_lesson_data(teacher_email, lesson_type_name)
INNER JOIN public.profiles p ON p.email = teacher_lesson_data.teacher_email
INNER JOIN public.teachers t ON t.user_id = p.user_id
INNER JOIN public.lesson_types lt ON lt.name = teacher_lesson_data.lesson_type_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.teacher_lesson_types tlt
  WHERE tlt.teacher_user_id = t.user_id
    AND tlt.lesson_type_id = lt.id
);

-- -----------------------------------------------------------------------------
-- TEACHER AVAILABILITY (for RLS testing)
-- -----------------------------------------------------------------------------
-- Logic: Each teacher gets availability slots that are LARGER than their lesson times.
-- This represents realistic availability where teachers have free time for new students.
-- Overlapping/adjacent blocks are merged into single blocks.
--
-- Extended schedule (covers lessons + extra availability):
--   Teacher 1 (Alice): Mon 08:00-18:00 (full day), Wed 10:00-20:00, Fri 09:00-13:00 (extra)
--   Teacher 2 (Bob): Tue 09:00-18:00 (full day), Thu 08:00-18:00 (full day), Sat 10:00-14:00 (extra)
--   Teacher 3 (Charlie): Mon 12:00-19:00, Wed 14:00-18:00 (extra), Fri 08:00-14:00
--   Teacher 4 (Diana): Tue 10:00-20:00, Thu 08:00-14:00, Sat 09:00-12:00 (extra)
--   Teacher 5 (Eve): Mon 09:00-17:00 (more than just bandcoaching), Thu 14:00-18:00 (extra)
--   Teacher 6 (Frank): Mon 14:00-17:00 (extra), Wed 08:00-14:00, Fri 12:00-19:00
--   Teacher 7 (Grace): Mon 08:00-15:00, Thu 09:00-15:00, Fri 10:00-14:00 (extra)
--   Teacher 8 (Henry): Tue 08:00-14:00, Wed 15:00-19:00 (extra), Fri 09:00-15:00
--   Teacher 9 (Iris): Wed 09:00-15:00, Thu 12:00-19:00, Tue 14:00-17:00 (extra)
--   Teacher 10 (Jack): Tue 10:00-14:00, Thu 10:00-14:00 (has availability but no students)
-- -----------------------------------------------------------------------------
INSERT INTO public.teacher_availability (teacher_user_id, day_of_week, start_time, end_time)
SELECT
  t.user_id AS teacher_user_id,
  availability_data.day_of_week,
  availability_data.start_time::TIME,
  availability_data.end_time::TIME
FROM (VALUES
  -- Teacher 1 (Alice) - Extended availability with extra slots
  ('teacher-alice@test.nl', 1, '09:00', '18:00'),  -- Monday full day (covers 09:00-12:00 + 14:00-17:00 lessons)
  ('teacher-alice@test.nl', 3, '10:00', '20:00'),  -- Wednesday extended (covers 14:00-17:00 lessons + extra)
  ('teacher-alice@test.nl', 5, '09:00', '13:00'),  -- Friday morning (extra availability, no lessons)

  -- Teacher 2 (Bob) - Extended availability
  ('teacher-bob@test.nl', 2, '09:00', '18:00'),    -- Tuesday full day (covers 10:00-13:00 + 14:00-17:00)
  ('teacher-bob@test.nl', 4, '08:00', '18:00'),    -- Thursday full day (covers 10:00-13:00 + 14:00-17:00)
  ('teacher-bob@test.nl', 6, '10:00', '14:00'),    -- Saturday morning (extra availability)

  -- Teacher 3 (Charlie) - Extended availability
  ('teacher-charlie@test.nl', 1, '12:00', '19:00'), -- Monday extended (covers 14:00-17:00)
  ('teacher-charlie@test.nl', 3, '14:00', '18:00'), -- Wednesday afternoon (extra)
  ('teacher-charlie@test.nl', 5, '08:00', '14:00'), -- Friday extended (covers 09:00-12:00)

  -- Teacher 4 (Diana) - Extended availability
  ('teacher-diana@test.nl', 2, '10:00', '20:00'),  -- Tuesday extended (covers 14:00-17:00)
  ('teacher-diana@test.nl', 4, '09:00', '14:00'),  -- Thursday extended (covers 09:00-12:00)
  ('teacher-diana@test.nl', 6, '09:00', '12:00'),  -- Saturday morning (extra)

  -- Teacher 5 (Eve) - Extended beyond just Bandcoaching
  ('teacher-eve@test.nl', 1, '09:00', '17:00'),    -- Monday extended (covers 14:00-15:00 bandcoaching + extra)
  ('teacher-eve@test.nl', 4, '14:00', '18:00'),    -- Thursday afternoon (extra availability)

  -- Teacher 6 (Frank) - Extended availability
  ('teacher-frank@test.nl', 1, '14:00', '17:00'),  -- Monday afternoon (extra)
  ('teacher-frank@test.nl', 3, '09:00', '14:00'),  -- Wednesday extended (covers 09:00-12:00)
  ('teacher-frank@test.nl', 5, '12:00', '19:00'),  -- Friday extended (covers 14:00-17:00)

  -- Teacher 7 (Grace) - Extended availability
  ('teacher-grace@test.nl', 1, '09:00', '15:00'),  -- Monday extended (covers 10:00-13:00)
  ('teacher-grace@test.nl', 4, '09:00', '15:00'),  -- Thursday extended (covers 10:00-13:00)
  ('teacher-grace@test.nl', 5, '10:00', '14:00'),  -- Friday late morning (extra)

  -- Teacher 8 (Henry) - Extended availability
  ('teacher-henry@test.nl', 2, '09:00', '14:00'),  -- Tuesday extended (covers 09:00-12:00)
  ('teacher-henry@test.nl', 3, '15:00', '19:00'),  -- Wednesday afternoon (extra)
  ('teacher-henry@test.nl', 5, '09:00', '15:00'),  -- Friday extended (covers 10:00-13:00)

  -- Teacher 9 (Iris) - Extended availability
  ('teacher-iris@test.nl', 2, '14:00', '17:00'),   -- Tuesday afternoon (extra)
  ('teacher-iris@test.nl', 3, '09:00', '15:00'),   -- Wednesday extended (covers 10:00-13:00)
  ('teacher-iris@test.nl', 4, '12:00', '19:00'),   -- Thursday extended (covers 14:00-17:00)

  -- Teacher 10 (Jack) - Has availability but no students
  ('teacher-jack@test.nl', 2, '10:00', '14:00'),   -- Tuesday late morning
  ('teacher-jack@test.nl', 4, '10:00', '14:00')    -- Thursday late morning
) AS availability_data(teacher_email, day_of_week, start_time, end_time)
INNER JOIN public.profiles p ON p.email = availability_data.teacher_email
INNER JOIN public.teachers t ON t.user_id = p.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.teacher_availability ta
  WHERE ta.teacher_user_id = t.user_id
    AND ta.day_of_week = availability_data.day_of_week
    AND ta.start_time = availability_data.start_time::TIME
    AND ta.end_time = availability_data.end_time::TIME
);

-- -----------------------------------------------------------------------------
-- LESSON AGREEMENTS (for RLS testing)
-- -----------------------------------------------------------------------------
-- Snapshot (duration_minutes, frequency, price_per_lesson) per agreement:
--   Bandcoaching: 60 min, biweekly, 60; DJ / Beats: 45 min, monthly, 45; others: 30 min, weekly, 30.
-- -----------------------------------------------------------------------------
INSERT INTO public.lesson_agreements (student_user_id, teacher_user_id, lesson_type_id, duration_minutes, frequency, price_per_lesson, day_of_week, start_time, start_date, end_date, is_active)
SELECT
  student_profile.user_id AS student_user_id,
  t.user_id AS teacher_user_id,
  lt.id AS lesson_type_id,
  snap.duration_minutes,
  snap.frequency,
  snap.price_per_lesson,
  agreement_data.day_of_week,
  agreement_data.start_time::TIME,
  agreement_data.start_date,
  agreement_data.end_date,
  agreement_data.is_active
FROM (VALUES
  -- ========================================================================
  -- BANDCOACHING GROUP LESSON (8 students, same time)
  -- ========================================================================
  -- Teacher 5 (Eve) - Bandcoaching - Monday 14:00 (1 hour group lesson)
  -- Students 001-008 all have the same lesson at the same time (THIS IS ALLOWED)
  ('student-001@test.nl', 'teacher-eve@test.nl', 'Bandcoaching', 1, '14:00', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '7 days', true),
  ('student-002@test.nl', 'teacher-eve@test.nl', 'Bandcoaching', 1, '14:00', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '7 days', true),
  ('student-003@test.nl', 'teacher-eve@test.nl', 'Bandcoaching', 1, '14:00', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '3 days', true),
  ('student-004@test.nl', 'teacher-eve@test.nl', 'Bandcoaching', 1, '14:00', CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-005@test.nl', 'teacher-eve@test.nl', 'Bandcoaching', 1, '14:00', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-006@test.nl', 'teacher-eve@test.nl', 'Bandcoaching', 1, '14:00', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-007@test.nl', 'teacher-eve@test.nl', 'Bandcoaching', 1, '14:00', CURRENT_DATE + INTERVAL '1 month', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-008@test.nl', 'teacher-eve@test.nl', 'Bandcoaching', 1, '14:00', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),

  -- ========================================================================
  -- TEACHER 1 (Alice) - Gitaarles, Drumles, Zangles - 12 UNIQUE slots
  -- ========================================================================
  -- Monday morning 09:00-12:00 (Gitaarles): 6 slots
  ('student-009@test.nl', 'teacher-alice@test.nl', 'Gitaarles', 1, '09:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '7 days', true),
  ('student-010@test.nl', 'teacher-alice@test.nl', 'Gitaarles', 1, '09:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '7 days', true),
  ('student-011@test.nl', 'teacher-alice@test.nl', 'Gitaarles', 1, '10:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '3 days', true),
  ('student-012@test.nl', 'teacher-alice@test.nl', 'Gitaarles', 1, '10:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-013@test.nl', 'teacher-alice@test.nl', 'Gitaarles', 1, '11:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-014@test.nl', 'teacher-alice@test.nl', 'Gitaarles', 1, '11:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  -- Monday afternoon 14:00-17:00 (Drumles): 6 slots
  ('student-015@test.nl', 'teacher-alice@test.nl', 'Drumles', 1, '14:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-016@test.nl', 'teacher-alice@test.nl', 'Drumles', 1, '14:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-017@test.nl', 'teacher-alice@test.nl', 'Drumles', 1, '15:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-018@test.nl', 'teacher-alice@test.nl', 'Drumles', 1, '15:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-019@test.nl', 'teacher-alice@test.nl', 'Drumles', 1, '16:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-020@test.nl', 'teacher-alice@test.nl', 'Drumles', 1, '16:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),

  -- ========================================================================
  -- TEACHER 2 (Bob) - Basles, Keyboardles - 12 UNIQUE slots
  -- ========================================================================
  -- Tuesday morning 10:00-13:00 (Basles): 6 slots
  ('student-021@test.nl', 'teacher-bob@test.nl', 'Basles', 2, '10:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '7 days', true),
  ('student-022@test.nl', 'teacher-bob@test.nl', 'Basles', 2, '10:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '3 days', true),
  ('student-023@test.nl', 'teacher-bob@test.nl', 'Basles', 2, '11:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-024@test.nl', 'teacher-bob@test.nl', 'Basles', 2, '11:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-025@test.nl', 'teacher-bob@test.nl', 'Basles', 2, '12:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-026@test.nl', 'teacher-bob@test.nl', 'Basles', 2, '12:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  -- Tuesday afternoon 14:00-17:00 (Keyboardles): 6 slots
  ('student-027@test.nl', 'teacher-bob@test.nl', 'Keyboardles', 2, '14:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-028@test.nl', 'teacher-bob@test.nl', 'Keyboardles', 2, '14:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-029@test.nl', 'teacher-bob@test.nl', 'Keyboardles', 2, '15:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-030@test.nl', 'teacher-bob@test.nl', 'Keyboardles', 2, '15:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-031@test.nl', 'teacher-bob@test.nl', 'Keyboardles', 2, '16:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-032@test.nl', 'teacher-bob@test.nl', 'Keyboardles', 2, '16:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),

  -- ========================================================================
  -- TEACHER 3 (Charlie) - Saxofoonles - 12 UNIQUE slots
  -- ========================================================================
  -- Monday afternoon 14:00-17:00: 6 slots
  ('student-033@test.nl', 'teacher-charlie@test.nl', 'Saxofoonles', 1, '14:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '3 days', true),
  ('student-034@test.nl', 'teacher-charlie@test.nl', 'Saxofoonles', 1, '14:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-035@test.nl', 'teacher-charlie@test.nl', 'Saxofoonles', 1, '15:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-036@test.nl', 'teacher-charlie@test.nl', 'Saxofoonles', 1, '15:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-037@test.nl', 'teacher-charlie@test.nl', 'Saxofoonles', 1, '16:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-038@test.nl', 'teacher-charlie@test.nl', 'Saxofoonles', 1, '16:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  -- Friday morning 09:00-12:00: 6 slots
  ('student-039@test.nl', 'teacher-charlie@test.nl', 'Saxofoonles', 5, '09:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-040@test.nl', 'teacher-charlie@test.nl', 'Saxofoonles', 5, '09:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-041@test.nl', 'teacher-charlie@test.nl', 'Saxofoonles', 5, '10:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-042@test.nl', 'teacher-charlie@test.nl', 'Saxofoonles', 5, '10:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-043@test.nl', 'teacher-charlie@test.nl', 'Saxofoonles', 5, '11:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-044@test.nl', 'teacher-charlie@test.nl', 'Saxofoonles', 5, '11:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),

  -- ========================================================================
  -- TEACHER 4 (Diana) - DJ / Beats (45 min lessons) - 8 UNIQUE slots
  -- ========================================================================
  -- Tuesday afternoon 14:00-17:00 (45 min = 4 lessons): 4 slots
  ('student-045@test.nl', 'teacher-diana@test.nl', 'DJ / Beats', 2, '14:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '3 days', true),
  ('student-046@test.nl', 'teacher-diana@test.nl', 'DJ / Beats', 2, '14:45',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-047@test.nl', 'teacher-diana@test.nl', 'DJ / Beats', 2, '15:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-048@test.nl', 'teacher-diana@test.nl', 'DJ / Beats', 2, '16:15',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  -- Thursday morning 09:00-12:00 (45 min = 4 lessons): 4 slots
  ('student-049@test.nl', 'teacher-diana@test.nl', 'DJ / Beats', 4, '09:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-050@test.nl', 'teacher-diana@test.nl', 'DJ / Beats', 4, '09:45',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-051@test.nl', 'teacher-diana@test.nl', 'DJ / Beats', 4, '10:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-052@test.nl', 'teacher-diana@test.nl', 'DJ / Beats', 4, '11:15',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),

  -- ========================================================================
  -- TEACHER 6 (Frank) - Gitaarles - 12 UNIQUE slots
  -- ========================================================================
  -- Wednesday morning 09:00-12:00: 6 slots
  ('student-053@test.nl', 'teacher-frank@test.nl', 'Gitaarles', 3, '09:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-054@test.nl', 'teacher-frank@test.nl', 'Gitaarles', 3, '09:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-055@test.nl', 'teacher-frank@test.nl', 'Gitaarles', 3, '10:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-056@test.nl', 'teacher-frank@test.nl', 'Gitaarles', 3, '10:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-057@test.nl', 'teacher-frank@test.nl', 'Gitaarles', 3, '11:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-058@test.nl', 'teacher-frank@test.nl', 'Gitaarles', 3, '11:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  -- Friday afternoon 14:00-17:00: 6 slots
  ('student-059@test.nl', 'teacher-frank@test.nl', 'Gitaarles', 5, '14:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-060@test.nl', 'teacher-frank@test.nl', 'Gitaarles', 5, '14:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-009@test.nl', 'teacher-frank@test.nl', 'Gitaarles', 5, '15:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-010@test.nl', 'teacher-frank@test.nl', 'Gitaarles', 5, '15:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-011@test.nl', 'teacher-frank@test.nl', 'Gitaarles', 5, '16:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-012@test.nl', 'teacher-frank@test.nl', 'Gitaarles', 5, '16:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),

  -- ========================================================================
  -- TEACHER 7 (Grace) - Drumles - 12 UNIQUE slots
  -- ========================================================================
  -- Monday late morning 10:00-13:00: 6 slots
  ('student-013@test.nl', 'teacher-grace@test.nl', 'Drumles', 1, '10:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-014@test.nl', 'teacher-grace@test.nl', 'Drumles', 1, '10:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-021@test.nl', 'teacher-grace@test.nl', 'Drumles', 1, '11:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-022@test.nl', 'teacher-grace@test.nl', 'Drumles', 1, '11:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-023@test.nl', 'teacher-grace@test.nl', 'Drumles', 1, '12:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-024@test.nl', 'teacher-grace@test.nl', 'Drumles', 1, '12:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  -- Thursday late morning 10:00-13:00: 6 slots
  ('student-025@test.nl', 'teacher-grace@test.nl', 'Drumles', 4, '10:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-026@test.nl', 'teacher-grace@test.nl', 'Drumles', 4, '10:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-027@test.nl', 'teacher-grace@test.nl', 'Drumles', 4, '11:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-028@test.nl', 'teacher-grace@test.nl', 'Drumles', 4, '11:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-029@test.nl', 'teacher-grace@test.nl', 'Drumles', 4, '12:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-030@test.nl', 'teacher-grace@test.nl', 'Drumles', 4, '12:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),

  -- ========================================================================
  -- TEACHER 8 (Henry) - Zang - 12 UNIQUE slots
  -- ========================================================================
  -- Tuesday morning 09:00-12:00: 6 slots
  ('student-031@test.nl', 'teacher-henry@test.nl', 'Zangles', 2, '09:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-032@test.nl', 'teacher-henry@test.nl', 'Zangles', 2, '09:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-033@test.nl', 'teacher-henry@test.nl', 'Zangles', 2, '10:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-034@test.nl', 'teacher-henry@test.nl', 'Zangles', 2, '10:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-035@test.nl', 'teacher-henry@test.nl', 'Zangles', 2, '11:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-036@test.nl', 'teacher-henry@test.nl', 'Zangles', 2, '11:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  -- Friday late morning 10:00-13:00: 6 slots
  ('student-037@test.nl', 'teacher-henry@test.nl', 'Zangles', 5, '10:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-038@test.nl', 'teacher-henry@test.nl', 'Zangles', 5, '10:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-039@test.nl', 'teacher-henry@test.nl', 'Zangles', 5, '11:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-040@test.nl', 'teacher-henry@test.nl', 'Zangles', 5, '11:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-041@test.nl', 'teacher-henry@test.nl', 'Zangles', 5, '12:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-042@test.nl', 'teacher-henry@test.nl', 'Zangles', 5, '12:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),

  -- ========================================================================
  -- TEACHER 9 (Iris) - Bas - 12 UNIQUE slots
  -- ========================================================================
  -- Wednesday late morning 10:00-13:00: 6 slots
  ('student-043@test.nl', 'teacher-iris@test.nl', 'Basles', 3, '10:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-044@test.nl', 'teacher-iris@test.nl', 'Basles', 3, '10:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-045@test.nl', 'teacher-iris@test.nl', 'Basles', 3, '11:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-046@test.nl', 'teacher-iris@test.nl', 'Basles', 3, '11:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-047@test.nl', 'teacher-iris@test.nl', 'Basles', 3, '12:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-048@test.nl', 'teacher-iris@test.nl', 'Basles', 3, '12:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  -- Thursday afternoon 14:00-17:00: 6 slots
  ('student-049@test.nl', 'teacher-iris@test.nl', 'Basles', 4, '14:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-050@test.nl', 'teacher-iris@test.nl', 'Basles', 4, '14:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-051@test.nl', 'teacher-iris@test.nl', 'Basles', 4, '15:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-052@test.nl', 'teacher-iris@test.nl', 'Basles', 4, '15:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-053@test.nl', 'teacher-iris@test.nl', 'Basles', 4, '16:00',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true),
  ('student-054@test.nl', 'teacher-iris@test.nl', 'Basles', 4, '16:30',   CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '6 months', true)

  -- ========================================================================
  -- NOTE: Teacher 10 (Jack) has NO lesson agreements (no students)
  -- ========================================================================
) AS agreement_data(student_email, teacher_email, lesson_type_name, day_of_week, start_time, start_date, end_date, is_active)
INNER JOIN (
  VALUES
    ('Bandcoaching', 60, 'biweekly'::public.lesson_frequency, 60.00),
    ('DJ / Beats', 45, 'monthly'::public.lesson_frequency, 45.00),
    ('Gitaarles', 30, 'weekly'::public.lesson_frequency, 30.00),
    ('Drumles', 30, 'weekly'::public.lesson_frequency, 30.00),
    ('Zangles', 30, 'weekly'::public.lesson_frequency, 30.00),
    ('Basles', 30, 'weekly'::public.lesson_frequency, 30.00),
    ('Keyboardles', 30, 'weekly'::public.lesson_frequency, 30.00),
    ('Saxofoonles', 30, 'weekly'::public.lesson_frequency, 30.00)
) AS snap(lesson_type_name, duration_minutes, frequency, price_per_lesson)
  ON snap.lesson_type_name = agreement_data.lesson_type_name
INNER JOIN public.profiles student_profile ON student_profile.email = agreement_data.student_email
INNER JOIN public.profiles teacher_profile ON teacher_profile.email = agreement_data.teacher_email
INNER JOIN public.teachers t ON t.user_id = teacher_profile.user_id
INNER JOIN public.lesson_types lt ON lt.name = agreement_data.lesson_type_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.lesson_agreements la
  WHERE la.student_user_id = student_profile.user_id
    AND la.teacher_user_id = t.user_id
    AND la.lesson_type_id = lt.id
    AND la.day_of_week = agreement_data.day_of_week
    AND la.start_time = agreement_data.start_time::TIME
    AND la.start_date = agreement_data.start_date
);

-- -----------------------------------------------------------------------------
-- CONSOLIDATE BANDCOACHING AGENDA EVENTS
-- -----------------------------------------------------------------------------
-- The trigger creates 1 agenda_event per lesson_agreement. For group lessons
-- (Bandcoaching), we want 1 event with multiple participants instead of 8
-- separate events. This block:
-- 1. Creates 1 consolidated Bandcoaching event for teacher Eve
-- 2. Adds all Bandcoaching students as participants to this single event
-- 3. Deletes the 8 individual events that the trigger created
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_eve_teacher_user_id UUID;
  v_bandcoaching_lt_id UUID;
  v_consolidated_event_id UUID;
  v_first_start_date DATE;
  v_last_end_date DATE;
BEGIN
  -- Get Eve's teacher user_id (teachers table uses user_id as PK)
  SELECT t.user_id INTO v_eve_teacher_user_id
  FROM public.teachers t
  JOIN public.profiles p ON p.user_id = t.user_id
  WHERE p.email = 'teacher-eve@test.nl';

  -- Get Bandcoaching lesson type ID
  SELECT id INTO v_bandcoaching_lt_id
  FROM public.lesson_types WHERE name = 'Bandcoaching';

  -- Get the date range from all Bandcoaching agreements
  -- Note: Bandcoaching is on Monday (day_of_week = 1), so we need to find the first Monday
  SELECT MIN(start_date), MAX(end_date) INTO v_first_start_date, v_last_end_date
  FROM public.lesson_agreements
  WHERE teacher_user_id = v_eve_teacher_user_id AND lesson_type_id = v_bandcoaching_lt_id;

  -- Adjust start_date to be a Monday (day_of_week = 1)
  -- If v_first_start_date is not a Monday, find the next Monday after it
  -- EXTRACT(DOW FROM date) returns 0=Sunday, 1=Monday, ..., 6=Saturday
  IF EXTRACT(DOW FROM v_first_start_date) != 1 THEN
    -- Move to next Monday: add (8 - current_dow) % 7 days, but if current_dow is 0 (Sunday), add 1
    v_first_start_date := v_first_start_date + ((8 - EXTRACT(DOW FROM v_first_start_date)::int) % 7)::int;
    -- If the result is still not Monday (edge case for Sunday), adjust
    IF EXTRACT(DOW FROM v_first_start_date) != 1 THEN
      v_first_start_date := v_first_start_date + (1 - EXTRACT(DOW FROM v_first_start_date)::int + 7) % 7;
    END IF;
  END IF;

  -- Delete the individual agenda_events that were auto-created by the trigger
  -- (This also cascades to delete their agenda_participants via ON DELETE CASCADE)
  DELETE FROM public.agenda_events
  WHERE source_type = 'lesson_agreement'
    AND source_id IN (
      SELECT id FROM public.lesson_agreements
      WHERE teacher_user_id = v_eve_teacher_user_id AND lesson_type_id = v_bandcoaching_lt_id
    );

  -- Create 1 consolidated Bandcoaching event
  -- Note: source_type = 'manual' because we're not linking to a single lesson_agreement
  -- The start_date is guaranteed to be a Monday (matching day_of_week = 1 from agreements)
  INSERT INTO public.agenda_events (
    source_type, source_id, owner_user_id, title, description,
    start_date, start_time, end_date, end_time,
    is_all_day, recurring, recurring_frequency, recurring_end_date,
    color, created_by, updated_by
  ) VALUES (
    'manual', NULL, v_eve_teacher_user_id, 'Bandcoaching', 'Groepsles met meerdere deelnemers',
    v_first_start_date, '14:00'::TIME,
    v_last_end_date, '15:00'::TIME,
    false, true, 'biweekly'::public.lesson_frequency, v_last_end_date,
    '#6366F1', v_eve_teacher_user_id, v_eve_teacher_user_id
  )
  RETURNING id INTO v_consolidated_event_id;

  -- Add Eve (teacher) as participant
  INSERT INTO public.agenda_participants (event_id, user_id)
  VALUES (v_consolidated_event_id, v_eve_teacher_user_id);

  -- Add all Bandcoaching students as participants
  INSERT INTO public.agenda_participants (event_id, user_id)
  SELECT DISTINCT v_consolidated_event_id, la.student_user_id
  FROM public.lesson_agreements la
  WHERE la.teacher_user_id = v_eve_teacher_user_id
    AND la.lesson_type_id = v_bandcoaching_lt_id;
END $$;

-- -----------------------------------------------------------------------------
-- STUDENT DATE_OF_BIRTH (seed only: 50/50 under 18 vs 18+, dob is optional in app)
-- -----------------------------------------------------------------------------
UPDATE public.students s
SET date_of_birth = dob.date_of_birth
FROM (
  SELECT user_id, date_of_birth FROM (VALUES
    ('50000000-0001-0000-0000-000000000000'::uuid, '2009-01-15'::date),
    ('50000000-0002-0000-0000-000000000000'::uuid, '2010-03-20'::date),
    ('50000000-0003-0000-0000-000000000000'::uuid, '2008-07-08'::date),
    ('50000000-0004-0000-0000-000000000000'::uuid, '2009-11-22'::date),
    ('50000000-0005-0000-0000-000000000000'::uuid, '2010-05-03'::date),
    ('50000000-0006-0000-0000-000000000000'::uuid, '2008-12-01'::date),
    ('50000000-0007-0000-0000-000000000000'::uuid, '2009-06-14'::date),
    ('50000000-0008-0000-0000-000000000000'::uuid, '2010-09-30'::date),
    ('50000000-0009-0000-0000-000000000000'::uuid, '2008-02-28'::date),
    ('50000000-0010-0000-0000-000000000000'::uuid, '2009-04-17'::date),
    ('50000000-0011-0000-0000-000000000000'::uuid, '2010-08-11'::date),
    ('50000000-0012-0000-0000-000000000000'::uuid, '2008-10-05'::date),
    ('50000000-0013-0000-0000-000000000000'::uuid, '2009-01-02'::date),
    ('50000000-0014-0000-0000-000000000000'::uuid, '2010-12-25'::date),
    ('50000000-0015-0000-0000-000000000000'::uuid, '2008-05-19'::date),
    ('50000000-0016-0000-0000-000000000000'::uuid, '2009-07-07'::date),
    ('50000000-0017-0000-0000-000000000000'::uuid, '2010-02-14'::date),
    ('50000000-0018-0000-0000-000000000000'::uuid, '2008-09-09'::date),
    ('50000000-0019-0000-0000-000000000000'::uuid, '2009-11-30'::date),
    ('50000000-0020-0000-0000-000000000000'::uuid, '2010-06-21'::date),
    ('50000000-0021-0000-0000-000000000000'::uuid, '2008-03-12'::date),
    ('50000000-0022-0000-0000-000000000000'::uuid, '2009-08-04'::date),
    ('50000000-0023-0000-0000-000000000000'::uuid, '2010-01-18'::date),
    ('50000000-0024-0000-0000-000000000000'::uuid, '2008-04-26'::date),
    ('50000000-0025-0000-0000-000000000000'::uuid, '2009-10-13'::date),
    ('50000000-0026-0000-0000-000000000000'::uuid, '2010-07-29'::date),
    ('50000000-0027-0000-0000-000000000000'::uuid, '2008-06-16'::date),
    ('50000000-0028-0000-0000-000000000000'::uuid, '2009-02-09'::date),
    ('50000000-0029-0000-0000-000000000000'::uuid, '2010-11-07'::date),
    ('50000000-0030-0000-0000-000000000000'::uuid, '2008-08-23'::date),
    ('50000000-0031-0000-0000-000000000000'::uuid, '2000-01-15'::date),
    ('50000000-0032-0000-0000-000000000000'::uuid, '1998-05-20'::date),
    ('50000000-0033-0000-0000-000000000000'::uuid, '2002-09-08'::date),
    ('50000000-0034-0000-0000-000000000000'::uuid, '1995-11-22'::date),
    ('50000000-0035-0000-0000-000000000000'::uuid, '2004-03-03'::date),
    ('50000000-0036-0000-0000-000000000000'::uuid, '1992-12-01'::date),
    ('50000000-0037-0000-0000-000000000000'::uuid, '2001-06-14'::date),
    ('50000000-0038-0000-0000-000000000000'::uuid, '1999-09-30'::date),
    ('50000000-0039-0000-0000-000000000000'::uuid, '2003-02-28'::date),
    ('50000000-0040-0000-0000-000000000000'::uuid, '1997-04-17'::date),
    ('50000000-0041-0000-0000-000000000000'::uuid, '2005-08-11'::date),
    ('50000000-0042-0000-0000-000000000000'::uuid, '1990-10-05'::date),
    ('50000000-0043-0000-0000-000000000000'::uuid, '2000-01-02'::date),
    ('50000000-0044-0000-0000-000000000000'::uuid, '1996-12-25'::date),
    ('50000000-0045-0000-0000-000000000000'::uuid, '2002-05-19'::date),
    ('50000000-0046-0000-0000-000000000000'::uuid, '1994-07-07'::date),
    ('50000000-0047-0000-0000-000000000000'::uuid, '2001-02-14'::date),
    ('50000000-0048-0000-0000-000000000000'::uuid, '1998-09-09'::date),
    ('50000000-0049-0000-0000-000000000000'::uuid, '2004-11-30'::date),
    ('50000000-0050-0000-0000-000000000000'::uuid, '1993-06-21'::date),
    ('50000000-0051-0000-0000-000000000000'::uuid, '2000-03-12'::date),
    ('50000000-0052-0000-0000-000000000000'::uuid, '1995-08-04'::date),
    ('50000000-0053-0000-0000-000000000000'::uuid, '2003-01-18'::date),
    ('50000000-0054-0000-0000-000000000000'::uuid, '1991-04-26'::date),
    ('50000000-0055-0000-0000-000000000000'::uuid, '2002-10-13'::date),
    ('50000000-0056-0000-0000-000000000000'::uuid, '1999-07-29'::date),
    ('50000000-0057-0000-0000-000000000000'::uuid, '2001-06-16'::date),
    ('50000000-0058-0000-0000-000000000000'::uuid, '1997-02-09'::date),
    ('50000000-0059-0000-0000-000000000000'::uuid, '2005-11-07'::date),
    ('50000000-0060-0000-0000-000000000000'::uuid, '1992-08-23'::date)
  ) AS t(user_id, date_of_birth)
) dob
WHERE s.user_id = dob.user_id;

-- -----------------------------------------------------------------------------
-- MANUAL AGENDA EVENTS (for dev menu users)
-- -----------------------------------------------------------------------------
-- All users that appear in the Dev Tools login menu get:
-- - 1 one-off event on a day they DON'T have lessons
-- - 1 recurring weekly event on a different day they DON'T have lessons
-- - owner_user_id and created_by set to the creating user
-- Plus shared events with multiple participants (from dev menu) so the same
-- event appears in multiple users' agendas.
--
-- IMPORTANT: Events are scheduled to NOT overlap with teacher lessons:
-- - Teacher Alice: Monday 09:00-12:00 (Gitaar), 14:00-17:00 (Drums), Wednesday 14:00-17:00 (Zangles)
-- - Teacher Eve: Monday 14:00-15:00 (Bandcoaching) - but Bandcoaching is now 1 event with multiple students
-- - Teacher Jack: NO lessons (no students)
-- - Non-teachers can have events on any day
--
-- Schedule per teacher:
-- - Alice: Tuesday + Thursday (avoids her Monday and Wednesday lessons)
-- - Eve: Tuesday + Wednesday (avoids her Monday Bandcoaching)
-- - Jack: Tuesday + Wednesday (no lessons, so any day works)
-- -----------------------------------------------------------------------------

-- Non-teacher users: Tuesday and Wednesday events (no lesson conflicts)
WITH
  non_teacher_dev_users AS (
    SELECT user_id FROM public.profiles WHERE email IN (
      'site-admin@test.nl', 'admin-one@test.nl', 'staff-one@test.nl',
      'student-001@test.nl', 'student-009@test.nl', 'student-010@test.nl',
      'user-001@test.nl', 'user-002@test.nl', 'user-003@test.nl'
    )
  ),
  week_start AS (SELECT date_trunc('week', CURRENT_DATE)::date AS ws),
  inserted AS (
    INSERT INTO public.agenda_events (
      source_type, source_id, owner_user_id, title, description, start_date, start_time, end_date, end_time,
      is_all_day, recurring, recurring_frequency, recurring_end_date, color, created_by, updated_by
    )
    SELECT
      'manual',
      NULL,
      d.user_id,
      CASE n
        WHEN 0 THEN 'Persoonlijke afspraak'
        WHEN 1 THEN 'Terugkerende planning'
      END,
      CASE WHEN n = 1 THEN 'Terugkerende afspraak' END,
      -- n=0: Tuesday (+1), n=1: Wednesday (+2)
      (SELECT ws FROM week_start) + (CASE n WHEN 0 THEN 1 WHEN 1 THEN 2 END)::integer,
      (CASE n WHEN 0 THEN '10:00' WHEN 1 THEN '15:00' END)::time,
      (SELECT ws FROM week_start) + (CASE n WHEN 0 THEN 1 WHEN 1 THEN 2 END)::integer,
      (CASE n WHEN 0 THEN '11:00' WHEN 1 THEN '16:00' END)::time,
      false,
      n = 1,
      CASE WHEN n = 1 THEN 'weekly'::public.lesson_frequency END,
      CASE WHEN n = 1 THEN (CURRENT_DATE + interval '3 months')::date END,
      CASE n WHEN 0 THEN '#4ade80' WHEN 1 THEN '#86efac' END,
      d.user_id,
      d.user_id
    FROM non_teacher_dev_users d
    CROSS JOIN (VALUES (0), (1)) AS t(n)
    RETURNING id, owner_user_id
  )
INSERT INTO public.agenda_participants (event_id, user_id)
SELECT id, owner_user_id FROM inserted;

-- Teacher Alice: Tuesday and Thursday events (avoids Monday + Wednesday lessons)
WITH
  alice AS (SELECT user_id FROM public.profiles WHERE email = 'teacher-alice@test.nl'),
  week_start AS (SELECT date_trunc('week', CURRENT_DATE)::date AS ws),
  inserted AS (
    INSERT INTO public.agenda_events (
      source_type, source_id, owner_user_id, title, description, start_date, start_time, end_date, end_time,
      is_all_day, recurring, recurring_frequency, recurring_end_date, color, created_by, updated_by
    )
    SELECT
      'manual',
      NULL,
      a.user_id,
      CASE n WHEN 0 THEN 'Persoonlijke afspraak' WHEN 1 THEN 'Terugkerende planning' END,
      CASE WHEN n = 1 THEN 'Terugkerende afspraak' END,
      -- n=0: Tuesday (+1), n=1: Thursday (+3) - avoids Monday and Wednesday lessons
      (SELECT ws FROM week_start) + (CASE n WHEN 0 THEN 1 WHEN 1 THEN 3 END)::integer,
      (CASE n WHEN 0 THEN '10:00' WHEN 1 THEN '15:00' END)::time,
      (SELECT ws FROM week_start) + (CASE n WHEN 0 THEN 1 WHEN 1 THEN 3 END)::integer,
      (CASE n WHEN 0 THEN '11:00' WHEN 1 THEN '16:00' END)::time,
      false,
      n = 1,
      CASE WHEN n = 1 THEN 'weekly'::public.lesson_frequency END,
      CASE WHEN n = 1 THEN (CURRENT_DATE + interval '3 months')::date END,
      CASE n WHEN 0 THEN '#4ade80' WHEN 1 THEN '#86efac' END,
      a.user_id,
      a.user_id
    FROM alice a
    CROSS JOIN (VALUES (0), (1)) AS t(n)
    RETURNING id, owner_user_id
  )
INSERT INTO public.agenda_participants (event_id, user_id)
SELECT id, owner_user_id FROM inserted;

-- Teacher Eve: Tuesday and Wednesday events (avoids Monday Bandcoaching)
WITH
  eve AS (SELECT user_id FROM public.profiles WHERE email = 'teacher-eve@test.nl'),
  week_start AS (SELECT date_trunc('week', CURRENT_DATE)::date AS ws),
  inserted AS (
    INSERT INTO public.agenda_events (
      source_type, source_id, owner_user_id, title, description, start_date, start_time, end_date, end_time,
      is_all_day, recurring, recurring_frequency, recurring_end_date, color, created_by, updated_by
    )
    SELECT
      'manual',
      NULL,
      e.user_id,
      CASE n WHEN 0 THEN 'Persoonlijke afspraak' WHEN 1 THEN 'Terugkerende planning' END,
      CASE WHEN n = 1 THEN 'Terugkerende afspraak' END,
      -- n=0: Tuesday (+1), n=1: Wednesday (+2) - avoids Monday Bandcoaching
      (SELECT ws FROM week_start) + (CASE n WHEN 0 THEN 1 WHEN 1 THEN 2 END)::integer,
      (CASE n WHEN 0 THEN '10:00' WHEN 1 THEN '15:00' END)::time,
      (SELECT ws FROM week_start) + (CASE n WHEN 0 THEN 1 WHEN 1 THEN 2 END)::integer,
      (CASE n WHEN 0 THEN '11:00' WHEN 1 THEN '16:00' END)::time,
      false,
      n = 1,
      CASE WHEN n = 1 THEN 'weekly'::public.lesson_frequency END,
      CASE WHEN n = 1 THEN (CURRENT_DATE + interval '3 months')::date END,
      CASE n WHEN 0 THEN '#4ade80' WHEN 1 THEN '#86efac' END,
      e.user_id,
      e.user_id
    FROM eve e
    CROSS JOIN (VALUES (0), (1)) AS t(n)
    RETURNING id, owner_user_id
  )
INSERT INTO public.agenda_participants (event_id, user_id)
SELECT id, owner_user_id FROM inserted;

-- Teacher Jack: Tuesday and Wednesday events (no lessons, any day works)
WITH
  jack AS (SELECT user_id FROM public.profiles WHERE email = 'teacher-jack@test.nl'),
  week_start AS (SELECT date_trunc('week', CURRENT_DATE)::date AS ws),
  inserted AS (
    INSERT INTO public.agenda_events (
      source_type, source_id, owner_user_id, title, description, start_date, start_time, end_date, end_time,
      is_all_day, recurring, recurring_frequency, recurring_end_date, color, created_by, updated_by
    )
    SELECT
      'manual',
      NULL,
      j.user_id,
      CASE n WHEN 0 THEN 'Persoonlijke afspraak' WHEN 1 THEN 'Terugkerende planning' END,
      CASE WHEN n = 1 THEN 'Terugkerende afspraak' END,
      -- n=0: Tuesday (+1), n=1: Wednesday (+2)
      (SELECT ws FROM week_start) + (CASE n WHEN 0 THEN 1 WHEN 1 THEN 2 END)::integer,
      (CASE n WHEN 0 THEN '10:00' WHEN 1 THEN '15:00' END)::time,
      (SELECT ws FROM week_start) + (CASE n WHEN 0 THEN 1 WHEN 1 THEN 2 END)::integer,
      (CASE n WHEN 0 THEN '11:00' WHEN 1 THEN '16:00' END)::time,
      false,
      n = 1,
      CASE WHEN n = 1 THEN 'weekly'::public.lesson_frequency END,
      CASE WHEN n = 1 THEN (CURRENT_DATE + interval '3 months')::date END,
      CASE n WHEN 0 THEN '#4ade80' WHEN 1 THEN '#86efac' END,
      j.user_id,
      j.user_id
    FROM jack j
    CROSS JOIN (VALUES (0), (1)) AS t(n)
    RETURNING id, owner_user_id
  )
INSERT INTO public.agenda_participants (event_id, user_id)
SELECT id, owner_user_id FROM inserted;

-- Multi-participant event: Vergadering (site-admin, admin-one, staff-one)
WITH new_event AS (
  INSERT INTO public.agenda_events (
    source_type, source_id, owner_user_id, title, description, start_date, start_time, end_date, end_time,
    is_all_day, recurring, recurring_frequency, recurring_end_date, color, created_by, updated_by
  )
  SELECT
    'manual', NULL, p.user_id, 'Vergadering', NULL,
    date_trunc('week', CURRENT_DATE)::date + 1, '14:00'::time,
    date_trunc('week', CURRENT_DATE)::date + 1, '15:00'::time,
    false, false, NULL, NULL, '#60a5fa', p.user_id, p.user_id
  FROM public.profiles p WHERE p.email = 'site-admin@test.nl'
  RETURNING id
)
INSERT INTO public.agenda_participants (event_id, user_id)
SELECT e.id, p.user_id FROM new_event e
CROSS JOIN public.profiles p WHERE p.email IN ('site-admin@test.nl', 'admin-one@test.nl', 'staff-one@test.nl');

-- Multi-participant recurring event: Wekelijks overleg (teacher-alice + haar student-012)
-- Teacher-student pairs can see each other via lesson_agreements RLS
WITH new_event AS (
  INSERT INTO public.agenda_events (
    source_type, source_id, owner_user_id, title, description, start_date, start_time, end_date, end_time,
    is_all_day, recurring, recurring_frequency, recurring_end_date, color, created_by, updated_by
  )
  SELECT
    'manual', NULL, p.user_id, 'Wekelijks overleg', 'Terugkerende afspraak',
    date_trunc('week', CURRENT_DATE)::date + 3, '09:00'::time,  -- Thursday (+3)
    date_trunc('week', CURRENT_DATE)::date + 3, '10:00'::time,
    false, true, 'weekly'::public.lesson_frequency, (CURRENT_DATE + interval '3 months')::date, '#facc15', p.user_id, p.user_id
  FROM public.profiles p WHERE p.email = 'teacher-alice@test.nl'
  RETURNING id
)
INSERT INTO public.agenda_participants (event_id, user_id)
SELECT e.id, p.user_id FROM new_event e
CROSS JOIN public.profiles p WHERE p.email IN ('teacher-alice@test.nl', 'student-012@test.nl');

-- Multi-participant recurring event: Team sync (site_admin, admin-one, staff-one)
WITH new_event AS (
  INSERT INTO public.agenda_events (
    source_type, source_id, owner_user_id, title, description, start_date, start_time, end_date, end_time,
    is_all_day, recurring, recurring_frequency, recurring_end_date, color, created_by, updated_by
  )
  SELECT
    'manual', NULL, p.user_id, 'Team sync', 'Wekelijkse teamsync',
    date_trunc('week', CURRENT_DATE)::date + 2, '10:00'::time,
    date_trunc('week', CURRENT_DATE)::date + 2, '11:00'::time,
    false, true, 'weekly'::public.lesson_frequency, (CURRENT_DATE + interval '3 months')::date, '#60a5fa', p.user_id, p.user_id
  FROM public.profiles p WHERE p.email = 'site-admin@test.nl'
  RETURNING id
)
INSERT INTO public.agenda_participants (event_id, user_id)
SELECT e.id, p.user_id FROM new_event e
CROSS JOIN public.profiles p WHERE p.email IN ('site-admin@test.nl', 'admin-one@test.nl', 'staff-one@test.nl');

-- Multi-participant event 2: Lesoverleg (teacher-eve + student-001 who have Bandcoaching agreement)
-- Scheduled on Tuesday at 16:00 to avoid any conflict with Bandcoaching (Monday 14:00)
WITH new_event AS (
  INSERT INTO public.agenda_events (
    source_type, source_id, owner_user_id, title, description, start_date, start_time, end_date, end_time,
    is_all_day, recurring, recurring_frequency, recurring_end_date, color, created_by, updated_by
  )
  SELECT
    'manual', NULL, p.user_id, 'Lesoverleg', 'Overleg docent en leerling',
    date_trunc('week', CURRENT_DATE)::date + 1, '16:00'::time,  -- Tuesday (+1) at 16:00
    date_trunc('week', CURRENT_DATE)::date + 1, '17:00'::time,
    false, false, NULL, NULL, '#4ade80', p.user_id, p.user_id
  FROM public.profiles p WHERE p.email = 'teacher-eve@test.nl'
  RETURNING id
)
INSERT INTO public.agenda_participants (event_id, user_id)
SELECT e.id, p.user_id FROM new_event e
CROSS JOIN public.profiles p WHERE p.email IN ('teacher-eve@test.nl', 'student-001@test.nl');

-- Multi-participant event 3: Project kick-off (privileged users only)
WITH new_event AS (
  INSERT INTO public.agenda_events (
    source_type, source_id, owner_user_id, title, description, start_date, start_time, end_date, end_time,
    is_all_day, recurring, recurring_frequency, recurring_end_date, color, created_by, updated_by
  )
  SELECT
    'manual', NULL, p.user_id, 'Project kick-off', 'Gezamenlijke kick-off',
    date_trunc('week', CURRENT_DATE)::date + 4, '09:00'::time,
    date_trunc('week', CURRENT_DATE)::date + 4, '10:30'::time,
    false, false, NULL, NULL, '#facc15', p.user_id, p.user_id
  FROM public.profiles p WHERE p.email = 'staff-one@test.nl'
  RETURNING id
)
INSERT INTO public.agenda_participants (event_id, user_id)
SELECT e.id, p.user_id FROM new_event e
CROSS JOIN public.profiles p WHERE p.email IN ('staff-one@test.nl', 'admin-one@test.nl');

-- -----------------------------------------------------------------------------
-- EXTRA AGENDA EVENTS FOR SITE_ADMIN (Jan Willem)
-- More events across past month, current month, and next month
-- Recurring events that started weeks ago
-- -----------------------------------------------------------------------------

-- One-off events in the past month for site_admin
WITH site_admin AS (
  SELECT user_id FROM public.profiles WHERE email = 'site-admin@test.nl'
),
past_events AS (
  INSERT INTO public.agenda_events (
    source_type, source_id, owner_user_id, title, description, start_date, start_time, end_date, end_time,
    is_all_day, recurring, recurring_frequency, recurring_end_date, color, created_by, updated_by
  )
  SELECT
    'manual', NULL, sa.user_id,
    CASE n
      WHEN 0 THEN 'Klantgesprek'
      WHEN 1 THEN 'Review meeting'
      WHEN 2 THEN 'Training sessie'
      WHEN 3 THEN 'Presentatie'
    END,
    'Afgelopen event',
    (CURRENT_DATE - interval '3 weeks')::date + n,
    (CASE n WHEN 0 THEN '09:00' WHEN 1 THEN '11:00' WHEN 2 THEN '14:00' WHEN 3 THEN '16:00' END)::time,
    (CURRENT_DATE - interval '3 weeks')::date + n,
    (CASE n WHEN 0 THEN '10:00' WHEN 1 THEN '12:00' WHEN 2 THEN '15:30' WHEN 3 THEN '17:00' END)::time,
    false, false, NULL, NULL,
    CASE n WHEN 0 THEN '#94a3b8' WHEN 1 THEN '#a78bfa' WHEN 2 THEN '#fb923c' WHEN 3 THEN '#38bdf8' END,
    sa.user_id, sa.user_id
  FROM site_admin sa
  CROSS JOIN generate_series(0, 3) n
  RETURNING id, owner_user_id
)
INSERT INTO public.agenda_participants (event_id, user_id)
SELECT id, owner_user_id FROM past_events;

-- One-off events in the next month for site_admin
WITH site_admin AS (
  SELECT user_id FROM public.profiles WHERE email = 'site-admin@test.nl'
),
future_events AS (
  INSERT INTO public.agenda_events (
    source_type, source_id, owner_user_id, title, description, start_date, start_time, end_date, end_time,
    is_all_day, recurring, recurring_frequency, recurring_end_date, color, created_by, updated_by
  )
  SELECT
    'manual', NULL, sa.user_id,
    CASE n
      WHEN 0 THEN 'Strategie sessie'
      WHEN 1 THEN 'Product launch'
      WHEN 2 THEN 'Team building'
      WHEN 3 THEN 'Kwartaal review'
      WHEN 4 THEN 'Planning Q3'
    END,
    'Toekomstig event',
    (CURRENT_DATE + interval '2 weeks')::date + n * 2,
    (CASE n WHEN 0 THEN '10:00' WHEN 1 THEN '13:00' WHEN 2 THEN '09:00' WHEN 3 THEN '15:00' WHEN 4 THEN '11:00' END)::time,
    (CURRENT_DATE + interval '2 weeks')::date + n * 2,
    (CASE n WHEN 0 THEN '12:00' WHEN 1 THEN '14:30' WHEN 2 THEN '17:00' WHEN 3 THEN '16:30' WHEN 4 THEN '12:30' END)::time,
    false, false, NULL, NULL,
    CASE n WHEN 0 THEN '#22c55e' WHEN 1 THEN '#ec4899' WHEN 2 THEN '#14b8a6' WHEN 3 THEN '#f97316' WHEN 4 THEN '#8b5cf6' END,
    sa.user_id, sa.user_id
  FROM site_admin sa
  CROSS JOIN generate_series(0, 4) n
  RETURNING id, owner_user_id
)
INSERT INTO public.agenda_participants (event_id, user_id)
SELECT id, owner_user_id FROM future_events;

-- Multi-participant recurring event: Standup (site-admin, admin-one, staff-one)
WITH new_event AS (
  INSERT INTO public.agenda_events (
    source_type, source_id, owner_user_id, title, description, start_date, start_time, end_date, end_time,
    is_all_day, recurring, recurring_frequency, recurring_end_date, color, created_by, updated_by
  )
  SELECT
    'manual', NULL, p.user_id, 'Standup', 'Recurring event gestart 4 weken geleden',
    (date_trunc('week', CURRENT_DATE) - interval '4 weeks')::date, '09:30'::time,
    (date_trunc('week', CURRENT_DATE) - interval '4 weeks')::date, '10:00'::time,
    false, true, 'weekly'::public.lesson_frequency, (CURRENT_DATE + interval '2 months')::date, '#06b6d4', p.user_id, p.user_id
  FROM public.profiles p WHERE p.email = 'site-admin@test.nl'
  RETURNING id
)
INSERT INTO public.agenda_participants (event_id, user_id)
SELECT e.id, p.user_id FROM new_event e
CROSS JOIN public.profiles p WHERE p.email IN ('site-admin@test.nl', 'admin-one@test.nl', 'staff-one@test.nl');

-- Multi-participant recurring event: Sprint review (privileged users only)
WITH new_event AS (
  INSERT INTO public.agenda_events (
    source_type, source_id, owner_user_id, title, description, start_date, start_time, end_date, end_time,
    is_all_day, recurring, recurring_frequency, recurring_end_date, color, created_by, updated_by
  )
  SELECT
    'manual', NULL, p.user_id, 'Sprint review', 'Recurring event gestart 4 weken geleden',
    (date_trunc('week', CURRENT_DATE) - interval '4 weeks')::date + 4, '10:00'::time,
    (date_trunc('week', CURRENT_DATE) - interval '4 weeks')::date + 4, '11:30'::time,
    false, true, 'biweekly'::public.lesson_frequency, (CURRENT_DATE + interval '2 months')::date, '#84cc16', p.user_id, p.user_id
  FROM public.profiles p WHERE p.email = 'site-admin@test.nl'
  RETURNING id
)
INSERT INTO public.agenda_participants (event_id, user_id)
SELECT e.id, p.user_id FROM new_event e
CROSS JOIN public.profiles p WHERE p.email IN ('site-admin@test.nl', 'admin-one@test.nl', 'staff-one@test.nl');

-- Multi-participant recurring event: 1-on-1 (site-admin, admin-one) - biweekly
WITH new_event AS (
  INSERT INTO public.agenda_events (
    source_type, source_id, owner_user_id, title, description, start_date, start_time, end_date, end_time,
    is_all_day, recurring, recurring_frequency, recurring_end_date, color, created_by, updated_by
  )
  SELECT
    'manual', NULL, p.user_id, '1-on-1', 'Recurring event gestart 4 weken geleden',
    (date_trunc('week', CURRENT_DATE) - interval '4 weeks')::date + 2, '14:00'::time,
    (date_trunc('week', CURRENT_DATE) - interval '4 weeks')::date + 2, '15:00'::time,
    false, true, 'biweekly'::public.lesson_frequency, (CURRENT_DATE + interval '2 months')::date, '#d946ef', p.user_id, p.user_id
  FROM public.profiles p WHERE p.email = 'site-admin@test.nl'
  RETURNING id
)
INSERT INTO public.agenda_participants (event_id, user_id)
SELECT e.id, p.user_id FROM new_event e
CROSS JOIN public.profiles p WHERE p.email IN ('site-admin@test.nl', 'admin-one@test.nl');

-- -----------------------------------------------------------------------------
-- PROJECT DOMAINS, LABELS, PROJECTS
-- -----------------------------------------------------------------------------
-- UUID structure:
--   70000000 = project_domain
--   71000000 = project_label
--   72000000 = project

INSERT INTO public.project_domains (id, name, created_by) VALUES
  ('70000000-0001-0000-0000-000000000000', 'Muziek', '10000000-0001-0000-0000-000000000000'),
  ('70000000-0002-0000-0000-000000000000', 'Dans', '10000000-0001-0000-0000-000000000000'),
  ('70000000-0003-0000-0000-000000000000', 'Theater', '10000000-0001-0000-0000-000000000000');

INSERT INTO public.project_labels (id, domain_id, name, created_by) VALUES
  ('71000000-0001-0000-0000-000000000000', '70000000-0001-0000-0000-000000000000', 'Gitaarles', '10000000-0001-0000-0000-000000000000'),
  ('71000000-0002-0000-0000-000000000000', '70000000-0001-0000-0000-000000000000', 'Pianoles', '10000000-0001-0000-0000-000000000000'),
  ('71000000-0003-0000-0000-000000000000', '70000000-0002-0000-0000-000000000000', 'Ballet', '10000000-0001-0000-0000-000000000000'),
  ('71000000-0004-0000-0000-000000000000', '70000000-0002-0000-0000-000000000000', 'Streetdance', '10000000-0001-0000-0000-000000000000'),
  ('71000000-0005-0000-0000-000000000000', '70000000-0003-0000-0000-000000000000', 'Impro', '10000000-0001-0000-0000-000000000000'),
  ('71000000-0006-0000-0000-000000000000', '70000000-0003-0000-0000-000000000000', 'Musical', '10000000-0001-0000-0000-000000000000');

INSERT INTO public.projects (id, label_id, name, owner_user_id, cost_center, created_by) VALUES
  ('72000000-0001-0000-0000-000000000000', '71000000-0001-0000-0000-000000000000', 'Gitaarproject Voorjaar', '20000000-0001-0000-0000-000000000000', 'KC-101', '10000000-0001-0000-0000-000000000000'),
  ('72000000-0002-0000-0000-000000000000', '71000000-0003-0000-0000-000000000000', 'Ballet Beginners', '40000000-0001-0000-0000-000000000000', 'KC-202', '10000000-0001-0000-0000-000000000000'),
  ('72000000-0003-0000-0000-000000000000', '71000000-0005-0000-0000-000000000000', 'Impro Workshop', '30000000-0001-0000-0000-000000000000', NULL, '10000000-0001-0000-0000-000000000000'),
  ('72000000-0004-0000-0000-000000000000', '71000000-0002-0000-0000-000000000000', 'Piano Masterclass', '40000000-0002-0000-0000-000000000000', 'KC-303', '10000000-0001-0000-0000-000000000000');

-- -----------------------------------------------------------------------------
-- PROJECT APPOINTMENTS (agenda_events with source_type = 'project')
-- Each project has at least one or more scheduled appointments.
-- -----------------------------------------------------------------------------
WITH week_start AS (SELECT date_trunc('week', CURRENT_DATE)::date AS ws),
project_events AS (
  INSERT INTO public.agenda_events (
    source_type, source_id, owner_user_id, title, description,
    start_date, start_time, end_date, end_time,
    is_all_day, recurring, recurring_frequency, recurring_end_date,
    color, created_by, updated_by
  )
  SELECT
    'project'::public.agenda_event_source_type,
    p.id,
    p.owner_user_id,
    (CASE n.n WHEN 1 THEN 'Voorbereiding' WHEN 2 THEN 'Les' WHEN 3 THEN 'Nabespreking' END),
    NULL,
    (SELECT ws FROM week_start) + 5 + ((n.n - 1) * 7),  -- Saturday (no lesson_agreements in seed), then +7 per occurrence
    (CASE (n.n % 3) WHEN 0 THEN '10:00' WHEN 1 THEN '14:00' ELSE '16:00' END)::time,
    (SELECT ws FROM week_start) + 5 + ((n.n - 1) * 7),
    (CASE (n.n % 3) WHEN 0 THEN '12:00' WHEN 1 THEN '16:00' ELSE '18:00' END)::time,
    false,
    false,
    NULL,
    NULL,
    '#6366F1',
    p.owner_user_id,
    p.owner_user_id
  FROM public.projects p
  CROSS JOIN (VALUES (1), (2), (3)) AS n(n)
  RETURNING id, owner_user_id
)
INSERT INTO public.agenda_participants (event_id, user_id)
SELECT id, owner_user_id FROM project_events;

-- -----------------------------------------------------------------------------
-- LESSON GROUP (Bandcoaching)
-- -----------------------------------------------------------------------------
-- One group for Eve's existing Monday 14:00 Bandcoaching slot.
-- Link the 8 agreements before inserting members. The member trigger inserts
-- a new agreement when none exists yet for that group and student.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_group_id uuid := '73000000-0001-0000-0000-000000000000';
  v_eve uuid := '40000000-0005-0000-0000-000000000000';
  v_site_admin uuid := '10000000-0001-0000-0000-000000000000';
  v_lt uuid;
  v_linked integer;
BEGIN
  SELECT id INTO v_lt FROM public.lesson_types WHERE name = 'Bandcoaching';
  IF v_lt IS NULL THEN
    RAISE EXCEPTION 'Bandcoaching lesson type missing from bootstrap seed';
  END IF;

  INSERT INTO public.lesson_groups (
    id, name, lesson_type_id, teacher_user_id,
    duration_minutes, frequency, price_per_lesson,
    day_of_week, start_time, start_date, is_active, created_by
  ) VALUES (
    v_group_id, 'Bandcoaching maandag', v_lt, v_eve,
    60, 'biweekly'::public.lesson_frequency, 60,
    1, '14:00'::time, CURRENT_DATE - 45, true, v_site_admin
  );

  UPDATE public.lesson_agreements
  SET lesson_group_id = v_group_id
  WHERE teacher_user_id = v_eve AND lesson_type_id = v_lt;

  GET DIAGNOSTICS v_linked = ROW_COUNT;
  IF v_linked <> 8 THEN
    RAISE EXCEPTION 'expected 8 Bandcoaching agreements, linked %', v_linked;
  END IF;

  INSERT INTO public.lesson_group_members (lesson_group_id, student_user_id, joined_date)
  SELECT v_group_id, la.student_user_id, la.start_date
  FROM public.lesson_agreements la
  WHERE la.lesson_group_id = v_group_id;

  GET DIAGNOSTICS v_linked = ROW_COUNT;
  IF v_linked <> 8 THEN
    RAISE EXCEPTION 'expected 8 lesson group members, inserted %', v_linked;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- SIGNUP REQUESTS
-- -----------------------------------------------------------------------------
-- One pending row uses student-001@test.nl so that student's Aanmeldingen tab
-- has a row. The other emails match no profile: user-001 must see zero rows,
-- and student-009 / teacher-alice tests require every visible row to be their email.
-- -----------------------------------------------------------------------------
INSERT INTO public.lesson_signup_requests (
  id, lesson_type_id, first_name, last_name, email, phone_number,
  date_of_birth, parent_name, parent_email, parent_phone_number,
  notes, status, processed_by, processed_at, created_by
)
SELECT
  v.id,
  lt.id,
  v.first_name,
  v.last_name,
  v.email,
  v.phone_number,
  v.date_of_birth,
  v.parent_name,
  v.parent_email,
  v.parent_phone_number,
  v.notes,
  v.status::public.signup_request_status,
  v.processed_by,
  v.processed_at,
  '10000000-0001-0000-0000-000000000000'
FROM (VALUES
  (
    '74000000-0001-0000-0000-000000000000'::uuid,
    'Gitaarles',
    'Lucas',
    'van der Berg',
    'student-001@test.nl',
    '0656789012',
    '2009-01-15'::date,
    'Karin van der Berg',
    'karin.vandenberg@example.nl',
    '0612340001',
    'Wil graag op maandag.',
    'pending',
    NULL::uuid,
    NULL::timestamptz
  ),
  (
    '74000000-0002-0000-0000-000000000000'::uuid,
    'Bandcoaching',
    'Noa',
    'Jansen',
    'noa.jansen@example.nl',
    '0687650002',
    '2011-04-12'::date,
    'Ingrid Jansen',
    'ingrid.jansen@example.nl',
    '0687650003',
    NULL,
    'trial_scheduled',
    NULL::uuid,
    NULL::timestamptz
  ),
  (
    '74000000-0003-0000-0000-000000000000'::uuid,
    'Zangles',
    'Milan',
    'Bakker',
    'milan.bakker@example.nl',
    '0687650004',
    '2004-09-01'::date,
    NULL,
    NULL,
    NULL,
    'Akkoord, overeenkomst volgt.',
    'approved',
    '10000000-0001-0000-0000-000000000000'::uuid,
    now() - interval '3 days'
  ),
  (
    '74000000-0004-0000-0000-000000000000'::uuid,
    'Drumles',
    'Eva',
    'Smit',
    'eva.smit@example.nl',
    '0687650005',
    '1998-02-20'::date,
    NULL,
    NULL,
    NULL,
    'Geen plek op het gewenste tijdstip.',
    'rejected',
    '20000000-0001-0000-0000-000000000000'::uuid,
    now() - interval '10 days'
  )
) AS v(
  id, lesson_type_name, first_name, last_name, email, phone_number,
  date_of_birth, parent_name, parent_email, parent_phone_number,
  notes, status, processed_by, processed_at
)
JOIN public.lesson_types lt ON lt.name = v.lesson_type_name;

-- -----------------------------------------------------------------------------
-- TRIAL LESSONS
-- -----------------------------------------------------------------------------
-- scheduled is student 001 with Eve, linked to the trial_scheduled signup,
-- so /my-trial has a row. No agenda event: the list reads trial_lessons.
-- -----------------------------------------------------------------------------
INSERT INTO public.trial_lessons (
  id, signup_request_id, student_user_id, teacher_user_id, lesson_type_id,
  scheduled_date, scheduled_start_time, duration_minutes, status, notes, created_by
)
SELECT
  v.id,
  v.signup_request_id,
  v.student_user_id,
  v.teacher_user_id,
  lt.id,
  v.scheduled_date,
  v.scheduled_start_time,
  v.duration_minutes,
  v.status::public.trial_lesson_status,
  v.notes,
  '10000000-0001-0000-0000-000000000000'
FROM (VALUES
  (
    '75000000-0001-0000-0000-000000000000'::uuid,
    '74000000-0002-0000-0000-000000000000'::uuid,
    '50000000-0001-0000-0000-000000000000'::uuid,
    '40000000-0005-0000-0000-000000000000'::uuid,
    'Bandcoaching',
    CURRENT_DATE + 7,
    '16:00'::time,
    60,
    'scheduled',
    'Proefles na aanmelding.'
  ),
  (
    '75000000-0002-0000-0000-000000000000'::uuid,
    NULL::uuid,
    '50000000-0021-0000-0000-000000000000'::uuid,
    '40000000-0002-0000-0000-000000000000'::uuid,
    'Basles',
    CURRENT_DATE - 14,
    '11:00'::time,
    30,
    'completed',
    NULL
  ),
  (
    '75000000-0003-0000-0000-000000000000'::uuid,
    NULL::uuid,
    '50000000-0033-0000-0000-000000000000'::uuid,
    '40000000-0003-0000-0000-000000000000'::uuid,
    'Saxofoonles',
    CURRENT_DATE - 3,
    '15:00'::time,
    30,
    'cancelled',
    'Leerling afgemeld.'
  ),
  (
    '75000000-0004-0000-0000-000000000000'::uuid,
    NULL::uuid,
    '50000000-0045-0000-0000-000000000000'::uuid,
    '40000000-0004-0000-0000-000000000000'::uuid,
    'DJ / Beats',
    CURRENT_DATE - 30,
    '18:00'::time,
    45,
    'converted',
    NULL
  )
) AS v(
  id, signup_request_id, student_user_id, teacher_user_id, lesson_type_name,
  scheduled_date, scheduled_start_time, duration_minutes, status, notes
)
JOIN public.lesson_types lt ON lt.name = v.lesson_type_name;

-- -----------------------------------------------------------------------------
-- NO-LESSON PERIODS
-- -----------------------------------------------------------------------------
INSERT INTO public.no_lesson_periods (id, name, start_date, end_date, description, created_by)
VALUES
  (
    '76000000-0001-0000-0000-000000000000',
    'Studiedagen',
    CURRENT_DATE,
    CURRENT_DATE + 1,
    'Geen lessen tijdens de studiedagen.',
    '10000000-0001-0000-0000-000000000000'
  ),
  (
    '76000000-0002-0000-0000-000000000000',
    'Herfstvakantie',
    CURRENT_DATE + 30,
    CURRENT_DATE + 44,
    'Schoolvakantie, lessen hervatten daarna.',
    '10000000-0001-0000-0000-000000000000'
  );

-- -----------------------------------------------------------------------------
-- ANNOUNCEMENTS
-- -----------------------------------------------------------------------------
-- One published row shows on the dashboard. The inactive row is only in beheer.
-- -----------------------------------------------------------------------------
INSERT INTO public.announcements (id, title, body, audience, published_at, is_active, created_by)
VALUES
  (
    '77000000-0001-0000-0000-000000000000',
    'Extra repetitie bandcoaching',
    'Volgende week repeteren we extra op maandag. Neem je instrument mee.',
    ARRAY['teachers', 'students']::text[],
    now() - interval '2 days',
    true,
    '10000000-0001-0000-0000-000000000000'
  ),
  (
    '77000000-0002-0000-0000-000000000000',
    'Concept: zomervakantie',
    'Dit bericht is nog niet gepubliceerd.',
    ARRAY['students']::text[],
    NULL,
    false,
    '10000000-0001-0000-0000-000000000000'
  );

-- -----------------------------------------------------------------------------
-- SEPA MANDATES
-- -----------------------------------------------------------------------------
-- pending / active / revoked so each status is visible.
-- Sequence is bumped so the next mandate reference does not collide.
-- -----------------------------------------------------------------------------
INSERT INTO public.sepa_mandates (
  id, student_user_id, mandate_reference, iban, bic, account_holder,
  signed_at, signature_method, status, sequence_type, first_used_at, revoked_at, created_by
)
VALUES
  (
    '78000000-0001-0000-0000-000000000000',
    '50000000-0001-0000-0000-000000000000',
    'MND-000001',
    'NL91ABNA0417164300',
    'ABNANL2A',
    'Lucas van der Berg',
    NULL,
    'digital',
    'pending',
    'FRST',
    NULL,
    NULL,
    '10000000-0001-0000-0000-000000000000'
  ),
  (
    '78000000-0002-0000-0000-000000000000',
    '50000000-0009-0000-0000-000000000000',
    'MND-000002',
    'NL91ABNA0417164300',
    'ABNANL2A',
    'Luuk de Vries',
    CURRENT_DATE - 60,
    'digital',
    'active',
    'RCUR',
    now() - interval '40 days',
    NULL,
    '10000000-0001-0000-0000-000000000000'
  ),
  (
    '78000000-0003-0000-0000-000000000000',
    '50000000-0012-0000-0000-000000000000',
    'MND-000003',
    'NL91ABNA0417164300',
    'ABNANL2A',
    'Max van Leeuwen',
    CURRENT_DATE - 90,
    'paper',
    'revoked',
    'RCUR',
    now() - interval '80 days',
    now() - interval '5 days',
    '10000000-0001-0000-0000-000000000000'
  );

-- Both guitar agreements of student 009 point at the one active mandate,
-- so "Samenstellen" on a draft batch inserts two rows.
UPDATE public.lesson_agreements la
SET
  payment_method = 'sepa',
  sepa_mandate_id = '78000000-0002-0000-0000-000000000000',
  monthly_amount_cents = 4500
FROM public.profiles sp, public.lesson_types lt
WHERE la.student_user_id = sp.user_id
  AND la.lesson_type_id = lt.id
  AND sp.email = 'student-009@test.nl'
  AND lt.name = 'Gitaarles'
  AND la.is_active = true;

UPDATE public.accounting_settings
SET
  sepa_mandate_next_seq = 4,
  invoice_number_next = 4
WHERE id = true;

-- -----------------------------------------------------------------------------
-- DIRECT DEBIT BATCHES
-- -----------------------------------------------------------------------------
-- Draft has no items (Samenstellen). Approved has the two SEPA rows.
-- Submitted is an earlier collection for student 012 (mandate now revoked).
-- -----------------------------------------------------------------------------
INSERT INTO public.direct_debit_batches (
  id, batch_number, status, collection_date, message_id,
  total_amount_cents, item_count, approved_by, approved_at, submitted_at, created_by
)
VALUES
  (
    '79000000-0001-0000-0000-000000000000',
    'INC-2026-001',
    'draft',
    (date_trunc('month', CURRENT_DATE) + interval '1 month' + interval '26 days')::date,
    NULL,
    0,
    0,
    NULL,
    NULL,
    NULL,
    '10000000-0001-0000-0000-000000000000'
  ),
  (
    '79000000-0002-0000-0000-000000000000',
    'INC-2026-002',
    'approved',
    (date_trunc('month', CURRENT_DATE) + interval '26 days')::date,
    NULL,
    0,
    0,
    '10000000-0001-0000-0000-000000000000',
    now() - interval '1 day',
    NULL,
    '10000000-0001-0000-0000-000000000000'
  ),
  (
    '79000000-0003-0000-0000-000000000000',
    'INC-2026-003',
    'submitted',
    (date_trunc('month', CURRENT_DATE) - interval '1 month' + interval '26 days')::date,
    'SEED-MSG-0003',
    0,
    0,
    '10000000-0001-0000-0000-000000000000',
    now() - interval '25 days',
    now() - interval '20 days',
    '10000000-0001-0000-0000-000000000000'
  );

INSERT INTO public.direct_debit_batch_items (
  id, batch_id, lesson_agreement_id, mandate_id, student_user_id,
  end_to_end_id, amount_cents, remittance_info, kind, sequence_type, status, created_by
)
SELECT
  ('7a000000-' || lpad(src.n::text, 4, '0') || '-0000-0000-000000000000')::uuid,
  '79000000-0002-0000-0000-000000000000',
  src.agreement_id,
  '78000000-0002-0000-0000-000000000000',
  src.student_user_id,
  'SEED-E2E-' || lpad(src.n::text, 4, '0'),
  4500,
  'Lesgeld ' || to_char(CURRENT_DATE, 'YYYY-MM') || ' - Luuk de Vries',
  'subscription',
  'RCUR',
  'pending',
  '10000000-0001-0000-0000-000000000000'
FROM (
  SELECT
    la.id AS agreement_id,
    la.student_user_id,
    row_number() OVER (ORDER BY tp.email, la.start_time) AS n
  FROM public.lesson_agreements la
  JOIN public.profiles sp ON sp.user_id = la.student_user_id
  JOIN public.profiles tp ON tp.user_id = la.teacher_user_id
  JOIN public.lesson_types lt ON lt.id = la.lesson_type_id
  WHERE sp.email = 'student-009@test.nl'
    AND lt.name = 'Gitaarles'
    AND la.is_active = true
    AND la.payment_method = 'sepa'
) src;

INSERT INTO public.direct_debit_batch_items (
  id, batch_id, lesson_agreement_id, mandate_id, student_user_id,
  end_to_end_id, amount_cents, remittance_info, kind, sequence_type, status, status_updated_at, created_by
)
SELECT
  '7a000000-0003-0000-0000-000000000000',
  '79000000-0003-0000-0000-000000000000',
  la.id,
  '78000000-0003-0000-0000-000000000000',
  la.student_user_id,
  'SEED-E2E-0003',
  3000,
  'Lesgeld ' || to_char(CURRENT_DATE - interval '1 month', 'YYYY-MM') || ' - Max van Leeuwen',
  'subscription',
  'RCUR',
  'accepted',
  now() - interval '18 days',
  '10000000-0001-0000-0000-000000000000'
FROM public.lesson_agreements la
JOIN public.profiles sp ON sp.user_id = la.student_user_id
JOIN public.profiles tp ON tp.user_id = la.teacher_user_id
JOIN public.lesson_types lt ON lt.id = la.lesson_type_id
WHERE sp.email = 'student-012@test.nl'
  AND tp.email = 'teacher-alice@test.nl'
  AND lt.name = 'Gitaarles'
  AND la.is_active = true;

SELECT public.recalc_direct_debit_batch('79000000-0002-0000-0000-000000000000');
SELECT public.recalc_direct_debit_batch('79000000-0003-0000-0000-000000000000');

DO $$
DECLARE
  v_sepa integer;
  v_approved integer;
  v_submitted integer;
BEGIN
  SELECT count(*) INTO v_sepa
  FROM public.lesson_agreements
  WHERE sepa_mandate_id = '78000000-0002-0000-0000-000000000000'
    AND payment_method = 'sepa';
  IF v_sepa <> 2 THEN
    RAISE EXCEPTION 'expected 2 SEPA agreements, got %', v_sepa;
  END IF;

  SELECT count(*) INTO v_approved
  FROM public.direct_debit_batch_items
  WHERE batch_id = '79000000-0002-0000-0000-000000000000';
  IF v_approved <> 2 THEN
    RAISE EXCEPTION 'expected 2 approved batch items, got %', v_approved;
  END IF;

  SELECT item_count INTO v_approved
  FROM public.direct_debit_batches
  WHERE id = '79000000-0002-0000-0000-000000000000';
  IF v_approved <> 2 THEN
    RAISE EXCEPTION 'approved batch item_count is %, expected 2', v_approved;
  END IF;

  SELECT count(*) INTO v_submitted
  FROM public.direct_debit_batch_items
  WHERE batch_id = '79000000-0003-0000-0000-000000000000';
  IF v_submitted <> 1 THEN
    RAISE EXCEPTION 'expected 1 submitted batch item, got %', v_submitted;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- INVOICES
-- -----------------------------------------------------------------------------
-- issued on student 001 (batch null) fills /my-invoices. No PDF path.
-- Numbers stay below accounting_settings.invoice_number_next.
-- -----------------------------------------------------------------------------
INSERT INTO public.invoices (
  id, invoice_number, student_user_id, batch_id,
  issue_date, due_date, period_start, period_end,
  amount_excl_btw_cents, btw_amount_cents, amount_total_cents,
  age_category, status, sent_at, paid_at, email_sent_to, created_by
)
VALUES
  (
    '7b000000-0001-0000-0000-000000000000',
    'INV-2026-00001',
    '50000000-0012-0000-0000-000000000000',
    NULL,
    CURRENT_DATE,
    CURRENT_DATE + 14,
    date_trunc('month', CURRENT_DATE)::date,
    (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::date,
    3000, 0, 3000,
    'under_21', 'draft',
    NULL, NULL, NULL,
    '10000000-0001-0000-0000-000000000000'
  ),
  (
    '7b000000-0002-0000-0000-000000000000',
    'INV-2026-00002',
    '50000000-0001-0000-0000-000000000000',
    NULL,
    CURRENT_DATE - 2,
    CURRENT_DATE + 12,
    date_trunc('month', CURRENT_DATE)::date,
    (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::date,
    4500, 0, 4500,
    'under_21', 'issued',
    now() - interval '1 day', NULL, 'student-001@test.nl',
    '10000000-0001-0000-0000-000000000000'
  ),
  (
    '7b000000-0003-0000-0000-000000000000',
    'INV-2026-00003',
    '50000000-0012-0000-0000-000000000000',
    '79000000-0003-0000-0000-000000000000',
    CURRENT_DATE - 40,
    CURRENT_DATE - 26,
    (date_trunc('month', CURRENT_DATE) - interval '1 month')::date,
    (date_trunc('month', CURRENT_DATE) - interval '1 day')::date,
    3000, 0, 3000,
    'under_21', 'paid',
    now() - interval '35 days', now() - interval '20 days', 'student-012@test.nl',
    '10000000-0001-0000-0000-000000000000'
  );

INSERT INTO public.invoice_lines (
  id, invoice_id, batch_item_id, description, lesson_date,
  quantity, unit_price_cents, btw_rate,
  amount_excl_btw_cents, btw_amount_cents, amount_total_cents,
  sort_order, created_by
)
VALUES
  (
    '7c000000-0001-0000-0000-000000000000',
    '7b000000-0001-0000-0000-000000000000',
    NULL,
    'Gitaarles',
    CURRENT_DATE,
    1, 3000, 0, 3000, 0, 3000,
    0,
    '10000000-0001-0000-0000-000000000000'
  ),
  (
    '7c000000-0002-0000-0000-000000000000',
    '7b000000-0002-0000-0000-000000000000',
    NULL,
    'Bandcoaching',
    CURRENT_DATE - 2,
    1, 4500, 0, 4500, 0, 4500,
    0,
    '10000000-0001-0000-0000-000000000000'
  ),
  (
    '7c000000-0003-0000-0000-000000000000',
    '7b000000-0003-0000-0000-000000000000',
    '7a000000-0003-0000-0000-000000000000',
    'Gitaarles',
    CURRENT_DATE - 40,
    1, 3000, 0, 3000, 0, 3000,
    0,
    '10000000-0001-0000-0000-000000000000'
  );

-- -----------------------------------------------------------------------------
-- MORE MANDATES, BATCHES AND INVOICES
-- -----------------------------------------------------------------------------
-- Students 002-040 (except 009 and 012, who already have a mandate) each get
-- one mandate. One non-group agreement per active mandate is switched to SEPA
-- so historical batches have a full set of lines. Agreement row count stays
-- the same: this is an update, not an insert.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  v_n integer := 3;
  v_bban text;
  v_rearranged text;
  v_numeric text;
  v_rem bigint;
  v_check integer;
  v_iban text;
  v_status text;
  v_holder text;
  i integer;
  ch text;
BEGIN
  FOR r IN
    SELECT s.user_id, p.first_name, p.last_name
    FROM public.students s
    JOIN public.profiles p ON p.user_id = s.user_id
    WHERE s.user_id > '50000000-0001-0000-0000-000000000000'
      AND s.user_id <= '50000000-0040-0000-0000-000000000000'
      AND s.user_id NOT IN (
        '50000000-0009-0000-0000-000000000000',
        '50000000-0012-0000-0000-000000000000'
      )
    ORDER BY s.user_id
  LOOP
    v_n := v_n + 1;
    v_bban := 'ABNA' || lpad(v_n::text, 10, '0');
    v_rearranged := v_bban || 'NL00';
    v_numeric := '';
    FOR i IN 1..length(v_rearranged) LOOP
      ch := substring(v_rearranged FROM i FOR 1);
      IF ch ~ '^[0-9]$' THEN
        v_numeric := v_numeric || ch;
      ELSE
        v_numeric := v_numeric || (ascii(ch) - 55)::text;
      END IF;
    END LOOP;
    v_rem := 0;
    FOR i IN 1..length(v_numeric) LOOP
      v_rem := (v_rem * 10 + substring(v_numeric FROM i FOR 1)::int) % 97;
    END LOOP;
    v_check := 98 - v_rem::integer;
    v_iban := 'NL' || lpad(v_check::text, 2, '0') || v_bban;
    IF NOT public.is_valid_iban(v_iban) THEN
      RAISE EXCEPTION 'generated IBAN failed validation: %', v_iban;
    END IF;

    v_status := CASE
      WHEN v_n % 10 = 0 THEN 'revoked'
      WHEN v_n % 10 IN (1, 2) THEN 'pending'
      ELSE 'active'
    END;
    v_holder := trim(both ' ' FROM coalesce(r.first_name, '') || ' ' || coalesce(r.last_name, ''));

    INSERT INTO public.sepa_mandates (
      id, student_user_id, mandate_reference, iban, bic, account_holder,
      signed_at, signature_method, status, sequence_type, first_used_at, revoked_at, created_by
    ) VALUES (
      ('78000000-' || lpad(v_n::text, 4, '0') || '-0000-0000-000000000000')::uuid,
      r.user_id,
      'MND-' || lpad(v_n::text, 6, '0'),
      v_iban,
      'ABNANL2A',
      v_holder,
      CASE WHEN v_status = 'pending' THEN NULL ELSE CURRENT_DATE - (v_n + 30) END,
      CASE WHEN v_n % 2 = 0 THEN 'paper' ELSE 'digital' END,
      v_status,
      CASE WHEN v_status = 'pending' THEN 'FRST' ELSE 'RCUR' END,
      CASE WHEN v_status = 'pending' THEN NULL ELSE now() - ((v_n + 20) || ' days')::interval END,
      CASE WHEN v_status = 'revoked' THEN now() - ((v_n % 15) || ' days')::interval ELSE NULL END,
      '10000000-0001-0000-0000-000000000000'
    );
  END LOOP;

  IF v_n <> 40 THEN
    RAISE EXCEPTION 'expected last mandate index 40, got %', v_n;
  END IF;
END $$;

UPDATE public.lesson_agreements la
SET
  payment_method = 'sepa',
  sepa_mandate_id = m.id,
  monthly_amount_cents = (la.price_per_lesson * 400)::bigint
FROM public.sepa_mandates m
WHERE m.student_user_id = la.student_user_id
  AND m.status = 'active'
  AND la.is_active = true
  AND la.lesson_group_id IS NULL
  AND la.sepa_mandate_id IS NULL
  AND la.id = (
    SELECT la2.id
    FROM public.lesson_agreements la2
    WHERE la2.student_user_id = la.student_user_id
      AND la2.is_active = true
      AND la2.lesson_group_id IS NULL
      AND la2.sepa_mandate_id IS NULL
    ORDER BY la2.start_time, la2.id
    LIMIT 1
  );

INSERT INTO public.direct_debit_batches (
  id, batch_number, status, collection_date, message_id,
  total_amount_cents, item_count,
  approved_by, approved_at, submitted_at, closed_at, notes, created_by
)
SELECT
  ('79000000-' || lpad(v.n::text, 4, '0') || '-0000-0000-000000000000')::uuid,
  'INC-2026-' || lpad(v.n::text, 3, '0'),
  v.status,
  (date_trunc('month', CURRENT_DATE) + (v.month_offset || ' months')::interval + interval '26 days')::date,
  CASE
    WHEN v.status IN ('submitted', 'closed') THEN 'SEED-MSG-' || lpad(v.n::text, 4, '0')
    ELSE NULL
  END,
  0,
  0,
  '10000000-0001-0000-0000-000000000000',
  now() - interval '2 days',
  CASE
    WHEN v.status IN ('submitted', 'closed') THEN now() - ((abs(v.month_offset) + 1) || ' days')::interval
    ELSE NULL
  END,
  CASE
    WHEN v.status = 'closed' THEN now() - (abs(v.month_offset) || ' days')::interval
    ELSE NULL
  END,
  v.notes,
  '10000000-0001-0000-0000-000000000000'
FROM (VALUES
  (4, 'closed', -8, NULL),
  (5, 'closed', -6, NULL),
  (6, 'closed', -5, NULL),
  (7, 'closed', -4, NULL),
  (8, 'closed', -3, NULL),
  (9, 'submitted', -2, NULL),
  (10, 'cancelled', -7, 'Geannuleerd voor indiening.'),
  (11, 'approved', 2, NULL)
) AS v(n, status, month_offset, notes);

INSERT INTO public.direct_debit_batch_items (
  id, batch_id, lesson_agreement_id, mandate_id, student_user_id,
  end_to_end_id, amount_cents, remittance_info, kind, sequence_type,
  status, reason_code, status_updated_at, created_by
)
SELECT
  ('7a000000-' || lpad((src.item_n + 3)::text, 4, '0') || '-0000-0000-000000000000')::uuid,
  src.batch_id,
  src.agreement_id,
  src.mandate_id,
  src.student_user_id,
  'SEED-' || src.batch_number || '-' || lpad(src.line_n::text, 4, '0'),
  src.amount_cents,
  'Lesgeld ' || to_char(src.collection_date, 'YYYY-MM') || ' - ' || src.student_name,
  'subscription',
  'RCUR',
  src.item_status,
  CASE src.item_status
    WHEN 'rejected' THEN 'AC01'
    WHEN 'reversed' THEN 'MD06'
    ELSE NULL
  END,
  CASE
    WHEN src.item_status IN ('accepted', 'rejected', 'reversed', 'submitted') THEN src.collection_date::timestamptz
    ELSE NULL
  END,
  '10000000-0001-0000-0000-000000000000'
FROM (
  SELECT
    b.id AS batch_id,
    b.batch_number,
    b.status AS batch_status,
    b.collection_date,
    la.id AS agreement_id,
    la.sepa_mandate_id AS mandate_id,
    la.student_user_id,
    la.monthly_amount_cents AS amount_cents,
    trim(both ' ' FROM coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) AS student_name,
    row_number() OVER (ORDER BY b.collection_date, la.id) AS item_n,
    row_number() OVER (PARTITION BY b.id ORDER BY la.id) AS line_n,
    CASE
      WHEN b.status = 'approved' THEN 'pending'
      WHEN b.status = 'submitted' THEN 'submitted'
      WHEN b.status = 'cancelled' THEN 'rejected'
      WHEN b.status = 'closed' AND (row_number() OVER (PARTITION BY b.id ORDER BY la.id)) % 17 = 0 THEN 'reversed'
      WHEN b.status = 'closed' AND (row_number() OVER (PARTITION BY b.id ORDER BY la.id)) % 13 = 0 THEN 'rejected'
      ELSE 'accepted'
    END AS item_status
  FROM public.direct_debit_batches b
  JOIN public.lesson_agreements la
    ON la.payment_method = 'sepa'
   AND la.is_active = true
   AND la.monthly_amount_cents > 0
   AND la.sepa_mandate_id IS NOT NULL
  JOIN public.sepa_mandates m
    ON m.id = la.sepa_mandate_id
   AND m.status = 'active'
  JOIN public.profiles p ON p.user_id = la.student_user_id
  WHERE b.batch_number >= 'INC-2026-004'
) src;

DO $$
DECLARE
  v_batch_id uuid;
BEGIN
  FOR v_batch_id IN
    SELECT id FROM public.direct_debit_batches WHERE batch_number >= 'INC-2026-004'
  LOOP
    PERFORM public.recalc_direct_debit_batch(v_batch_id);
  END LOOP;
END $$;

INSERT INTO public.invoices (
  id, invoice_number, student_user_id, batch_id,
  issue_date, due_date, period_start, period_end,
  amount_excl_btw_cents, btw_amount_cents, amount_total_cents,
  age_category, status, sent_at, paid_at, email_sent_to, created_by
)
SELECT
  ('7b000000-' || lpad((g.rn + 3)::text, 4, '0') || '-0000-0000-000000000000')::uuid,
  'INV-2026-' || lpad((g.rn + 3)::text, 5, '0'),
  g.student_user_id,
  g.batch_id,
  CASE WHEN g.batch_status = 'approved' THEN CURRENT_DATE ELSE g.collection_date - 4 END,
  CASE WHEN g.batch_status = 'approved' THEN CURRENT_DATE + 14 ELSE g.collection_date + 10 END,
  date_trunc('month', g.collection_date)::date,
  (date_trunc('month', g.collection_date) + interval '1 month' - interval '1 day')::date,
  g.total_cents, 0, g.total_cents,
  g.age_category,
  CASE g.batch_status
    WHEN 'closed' THEN 'paid'
    WHEN 'submitted' THEN 'issued'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'draft'
  END,
  CASE
    WHEN g.batch_status IN ('closed', 'submitted') THEN (g.collection_date - 4)::timestamptz
    ELSE NULL
  END,
  CASE WHEN g.batch_status = 'closed' THEN g.collection_date::timestamptz ELSE NULL END,
  CASE WHEN g.batch_status IN ('closed', 'submitted') THEN g.email ELSE NULL END,
  '10000000-0001-0000-0000-000000000000'
FROM (
  SELECT
    b.id AS batch_id,
    b.status AS batch_status,
    b.collection_date,
    i.student_user_id,
    sum(i.amount_cents)::bigint AS total_cents,
    p.email,
    CASE
      WHEN s.date_of_birth IS NULL THEN 'unknown'
      WHEN s.date_of_birth > (CURRENT_DATE - interval '21 years')::date THEN 'under_21'
      ELSE '21_plus'
    END AS age_category,
    row_number() OVER (ORDER BY b.collection_date, i.student_user_id) AS rn
  FROM public.direct_debit_batch_items i
  JOIN public.direct_debit_batches b ON b.id = i.batch_id
  JOIN public.profiles p ON p.user_id = i.student_user_id
  LEFT JOIN public.students s ON s.user_id = i.student_user_id
  WHERE b.batch_number >= 'INC-2026-004'
  GROUP BY b.id, b.status, b.collection_date, i.student_user_id, p.email, s.date_of_birth
) g;

INSERT INTO public.invoice_lines (
  id, invoice_id, batch_item_id, description, lesson_date,
  quantity, unit_price_cents, btw_rate,
  amount_excl_btw_cents, btw_amount_cents, amount_total_cents,
  sort_order, created_by
)
SELECT
  ('7c000000-' || lpad((row_number() OVER (ORDER BY inv.invoice_number, it.id) + 3)::text, 4, '0') || '-0000-0000-000000000000')::uuid,
  inv.id,
  it.id,
  coalesce(lt.name, 'Lesgeld'),
  b.collection_date,
  1,
  it.amount_cents,
  0,
  it.amount_cents,
  0,
  it.amount_cents,
  (row_number() OVER (PARTITION BY inv.id ORDER BY it.id) - 1)::integer,
  '10000000-0001-0000-0000-000000000000'
FROM public.invoices inv
JOIN public.direct_debit_batch_items it
  ON it.batch_id = inv.batch_id
 AND it.student_user_id = inv.student_user_id
JOIN public.direct_debit_batches b ON b.id = it.batch_id
LEFT JOIN public.lesson_agreements la ON la.id = it.lesson_agreement_id
LEFT JOIN public.lesson_types lt ON lt.id = la.lesson_type_id
WHERE inv.invoice_number >= 'INV-2026-00004';

-- Extra invoices with no batch, so a few leerling accounts have their own history.
INSERT INTO public.invoices (
  id, invoice_number, student_user_id, batch_id,
  issue_date, due_date, period_start, period_end,
  amount_excl_btw_cents, btw_amount_cents, amount_total_cents,
  age_category, status, sent_at, paid_at, email_sent_to, created_by
)
SELECT
  ('7b000000-' || lpad((base.n + x.i)::text, 4, '0') || '-0000-0000-000000000000')::uuid,
  'INV-2026-' || lpad((base.n + x.i)::text, 5, '0'),
  x.student_user_id,
  NULL,
  CURRENT_DATE - x.days_ago,
  CURRENT_DATE - x.days_ago + 14,
  (date_trunc('month', CURRENT_DATE - x.days_ago))::date,
  (date_trunc('month', CURRENT_DATE - x.days_ago) + interval '1 month' - interval '1 day')::date,
  x.cents, 0, x.cents,
  x.age_category,
  x.status,
  CASE WHEN x.status IN ('issued', 'paid') THEN (CURRENT_DATE - x.days_ago)::timestamptz ELSE NULL END,
  CASE WHEN x.status = 'paid' THEN (CURRENT_DATE - x.days_ago + 8)::timestamptz ELSE NULL END,
  CASE WHEN x.status IN ('issued', 'paid') THEN p.email ELSE NULL END,
  '10000000-0001-0000-0000-000000000000'
FROM (
  SELECT max(substring(invoice_number FROM '([0-9]+)$')::int) AS n
  FROM public.invoices
) base
CROSS JOIN (VALUES
  (1, '50000000-0001-0000-0000-000000000000'::uuid, 'paid', 4500, 80, 'under_21'),
  (2, '50000000-0001-0000-0000-000000000000'::uuid, 'paid', 4500, 50, 'under_21'),
  (3, '50000000-0001-0000-0000-000000000000'::uuid, 'cancelled', 4500, 20, 'under_21'),
  (4, '50000000-0001-0000-0000-000000000000'::uuid, 'draft', 4500, 0, 'under_21'),
  (5, '50000000-0009-0000-0000-000000000000'::uuid, 'issued', 9000, 12, 'under_21'),
  (6, '50000000-0031-0000-0000-000000000000'::uuid, 'issued', 6000, 9, '21_plus')
) AS x(i, student_user_id, status, cents, days_ago, age_category)
JOIN public.profiles p ON p.user_id = x.student_user_id;

INSERT INTO public.invoice_lines (
  id, invoice_id, description, lesson_date,
  quantity, unit_price_cents, btw_rate,
  amount_excl_btw_cents, btw_amount_cents, amount_total_cents,
  sort_order, created_by
)
SELECT
  ('7c000000-' || lpad((base.n + row_number() OVER (ORDER BY inv.invoice_number))::text, 4, '0') || '-0000-0000-000000000000')::uuid,
  inv.id,
  CASE inv.student_user_id
    WHEN '50000000-0009-0000-0000-000000000000' THEN 'Gitaarles'
    WHEN '50000000-0031-0000-0000-000000000000' THEN 'Keyboardles'
    ELSE 'Bandcoaching'
  END,
  inv.issue_date,
  1,
  inv.amount_total_cents,
  0,
  inv.amount_total_cents,
  0,
  inv.amount_total_cents,
  0,
  '10000000-0001-0000-0000-000000000000'
FROM public.invoices inv
CROSS JOIN (
  SELECT max(substring(id::text FROM 10 FOR 4)::int) AS n
  FROM public.invoice_lines
) base
WHERE NOT EXISTS (
  SELECT 1 FROM public.invoice_lines existing WHERE existing.invoice_id = inv.id
);

UPDATE public.accounting_settings
SET
  sepa_mandate_next_seq = 41,
  invoice_number_next = (
    SELECT max(substring(invoice_number FROM '([0-9]+)$')::int) + 1
    FROM public.invoices
  )
WHERE id = true;

DO $$
DECLARE
  v_mandates integer;
  v_batches integer;
  v_items integer;
  v_invoices integer;
BEGIN
  SELECT count(*) INTO v_mandates FROM public.sepa_mandates;
  IF v_mandates <> 40 THEN
    RAISE EXCEPTION 'expected 40 mandates, got %', v_mandates;
  END IF;

  SELECT count(*) INTO v_batches FROM public.direct_debit_batches;
  IF v_batches <> 11 THEN
    RAISE EXCEPTION 'expected 11 direct debit batches, got %', v_batches;
  END IF;

  SELECT count(*) INTO v_items
  FROM public.direct_debit_batch_items i
  JOIN public.direct_debit_batches b ON b.id = i.batch_id
  WHERE b.batch_number >= 'INC-2026-004';
  IF v_items < 80 THEN
    RAISE EXCEPTION 'expected at least 80 extra batch items, got %', v_items;
  END IF;

  SELECT count(*) INTO v_invoices FROM public.invoices;
  IF v_invoices < 80 THEN
    RAISE EXCEPTION 'expected at least 80 invoices, got %', v_invoices;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- PARENT CONTACT (under-18 students 001-003)
-- -----------------------------------------------------------------------------
UPDATE public.students SET
  parent_name = 'Karin van der Berg',
  parent_email = 'karin.vandenberg@example.nl',
  parent_phone_number = '0612340001'
WHERE user_id = '50000000-0001-0000-0000-000000000000';

UPDATE public.students SET
  parent_name = 'Peter de Jong',
  parent_email = 'peter.dejong@example.nl',
  parent_phone_number = '0612340002'
WHERE user_id = '50000000-0002-0000-0000-000000000000';

UPDATE public.students SET
  parent_name = 'Sandra Bakker',
  parent_email = 'sandra.bakker@example.nl',
  parent_phone_number = '0612340003'
WHERE user_id = '50000000-0003-0000-0000-000000000000';

-- =============================================================================
-- END SEED
-- =============================================================================
