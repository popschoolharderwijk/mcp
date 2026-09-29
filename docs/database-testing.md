# Database Testing (RLS + Auth)

## How it works

Tests run against a **remote Supabase project** (no local instance). Two projects are in use:

- **mcp-test** (`jserlqacarlgtdzrblic`): used by **CI when `supabase/**` or non-code tests change**, and optionally locally via `bun dev:test` / `bun test tests/rls` (credentials in `.env.test` or env).
- **mcp-dev** (`zdvscmogkfyddnnxzkdu`): development; you can also test locally against mcp-dev if your env points there.

**In CI** (`pull-request-supabase.yml`):
- Runs only when `supabase/**` or `tests/**` changes, excluding `tests/code/**`
- The workflow links to **mcp-test** (via secret `SUPABASE_PROJECT_REF`)
- `supabase db reset --linked --yes` (`seeds/bootstrap.sql` + `seeds/test.sql` are applied)
- Credentials from GitHub secrets (must belong to mcp-test) → `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `bun test tests/rls tests/auth tests/e2e` runs against mcp-test

---

## Seed Data for RLS Tests

On `supabase db reset --linked`, two seed files are applied (see `supabase/config.toml`):

| File | Purpose |
|------|---------|
| [`supabase/seeds/bootstrap.sql`](../supabase/seeds/bootstrap.sql) | Production-safe reference data: lesson types, options, email templates, accounting singleton |
| [`supabase/seeds/test.sql`](../supabase/seeds/test.sql) | RLS test data: test users, roles, agreements, agenda, projects |

`seeds/test.sql` includes:

| Type | Users |
|------|-------|
| **site_admin** | `site-admin@test.nl` (1) |
| **admin** | `admin-one@test.nl`, `admin-two@test.nl` (2) |
| **staff** | `staff-one@test.nl` through `staff-five@test.nl` (5) |
| **teachers** | `teacher-alice@test.nl` through `teacher-jack@test.nl` (10) |
| **students** | `student-001@test.nl` through `student-060@test.nl` (60) |
| **users (no role)** | `user-001@test.nl` through `user-010@test.nl` (10) |

`seeds/test.sql` also contains (bootstrap supplies lesson types):
- **Lesson types**: Reference data in `seeds/bootstrap.sql` (not in test.sql)
- **Students**: Link student users to student records
- **Teachers**: Link teacher users to teacher records
- **Lesson agreements**: Agreements between students and teachers
- **Project domains / labels / projects**: Reference data for the projects module

---

## Test Structure

### Test Fixtures (`tests/rls/fixtures.ts`)

All seed data is fetched once and cached in `fixtures.ts`:

```typescript
fixtures.allProfiles         // All profiles
fixtures.allStudents         // All student records
fixtures.allTeachers         // All teacher records
fixtures.allLessonTypes      // All lesson types
fixtures.allLessonAgreements // All lesson agreements

fixtures.requireUserId(email)                 // user_id from email
fixtures.requireStudentId(email)              // student.id from email
fixtures.requireTeacherId(email)              // teacher.id from email
fixtures.requireLessonTypeId(name)            // lesson_type.id from name
fixtures.requireAgreementId(student, teacher) // agreement.id from student+teacher
fixtures.allProjectDomains / allProjectLabels / allProjects  // project reference data
```

---

## What is tested

### RLS Tests (`tests/rls/`)

#### System (`system/`)

- ✅ RLS is enabled on all expected tables
- ✅ All expected policies exist
- ✅ No unexpected policies
- ✅ Security helper functions exist (`is_admin`, `is_teacher`, `is_student`, etc.)
- ✅ Seed data ground truth (correct user counts per type)
- ✅ Triggers work correctly (immutability, updated_at, site_admin protection)
- ✅ Anonymous users have no access to data

#### Profiles (`profiles/`)

- ✅ SELECT: student sees own profile + own teachers' profiles; teacher sees own profile + own students' profiles; staff/admin/site_admin see everything
- ✅ UPDATE: own profile editable; staff/admin/site_admin can update everything
- ✅ INSERT/DELETE: blocked for all roles (trigger/cascade)
- ✅ Validation: phone number (10 digits)

#### User Roles (`user-roles/`)

- ✅ SELECT: admin/staff/site_admin see all roles; other users do not
- ✅ INSERT: admin (not site_admin), site_admin (everything)
- ✅ UPDATE: admin (not site_admin roles), site_admin (everything)
- ✅ DELETE: admin (not site_admin roles), site_admin (everything)

#### Students (`students/`)

- ✅ SELECT: students see own record; teachers see own students (via lesson_agreements); staff/admin/site_admin see everything
- ✅ INSERT: blocked for all roles (created automatically via triggers on lesson_agreements)
- ✅ UPDATE: admin/site_admin only
- ✅ DELETE: blocked for all roles, including site_admin (removed automatically via triggers when all lesson_agreements are gone)

#### Teachers (`teachers/`)

- ✅ SELECT: students see own teachers (via lesson_agreements); teachers see own record; staff/admin/site_admin see everything
- ✅ INSERT/UPDATE/DELETE: admin/site_admin only

#### Lesson Types (`lesson-types/`)

- ✅ SELECT: all signed-in users (public reference data)
- ✅ INSERT/UPDATE/DELETE: admin/site_admin only

#### Lesson Agreements (`lesson-agreements/`)

- ✅ SELECT: students see own agreements, teachers see own agreements, staff/admin/site_admin see everything
- ✅ INSERT/UPDATE/DELETE: staff/admin/site_admin only
- ✅ Students and teachers cannot change agreements

#### Project Domains / Labels / Projects (`projects/`)

- ✅ SELECT: all signed-in users see domains, labels, and projects
- ✅ INSERT/UPDATE/DELETE domains and labels: admin/site_admin only
- ✅ INSERT/UPDATE/DELETE projects: admin/site_admin only (not staff)
- ✅ Anonymous users have no access

#### Users without a role (`users/`)

- ✅ SELECT: own profile only; no access to students/teachers/agreements/roles
- ✅ INSERT/UPDATE/DELETE: update own profile only, nothing else

### Auth Tests (`tests/auth/`)

- ✅ Password policy enforcement (min. 32 chars, letters+digits+symbols)
- ✅ Passwords without symbols/digits/letters are rejected
- ✅ Valid passwords are accepted (user unconfirmed)
- ✅ OTP/Magic Link sign-in flow
- ✅ User deletion (CASCADE behaviour, site_admin protection)

---

## Running tests locally

Locally you can test against **mcp-test** or **mcp-dev**. Put the project credentials in your environment (e.g. `.env.test`):

- `SUPABASE_URL` — URL of the Supabase project
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (to bypass RLS in fixtures)
- `SUPABASE_PUBLISHABLE_DEFAULT_KEY` — anon key (for the client)
- `VITE_DEV_LOGIN_PASSWORD` — password of seed users (e.g. `password`)

```bash
# All database tests (use path prefixes — bare `auth` also matches tests/code/auth/)
bun test tests/rls tests/auth

# RLS tests only
bun test tests/rls

# Auth tests only
bun test tests/auth

# Specific test category
bun test tests/rls/lesson-agreements
bun test tests/rls/teachers
```

---

## Environment Variables

For local testing: put credentials in `.env.test` or export them in your shell (same variables as in "Running tests locally"). For CI they come from GitHub secrets; see [secrets.md](./secrets.md).
