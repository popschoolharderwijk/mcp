# Architecture

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **Testing**: Bun test runner
- **Linting**: Biome
- **CI/CD**: GitHub Actions

---

## Database Schema

### Overview

```
auth.users
    ├── profiles        (1:1, via trigger on_auth_user_created)
    ├── user_roles      (0..1:1, optional — only for site_admin/admin/staff)
    ├── students        (0..1:1, optional — student registration)
    └── teachers        (0..1:1, optional — teacher registration)

students ──┐
teachers ──┼── lesson_agreements (N:M via join table)
lesson_types ─┘

project_domains ── project_labels ── projects (owner: auth.users)
agenda_events (source: manual | lesson_agreement | project) ── agenda_participants
```

Agenda: `agenda_events` can be linked to a lesson agreement (`source_type = 'lesson_agreement'`), a project (`source_type = 'project'`), or created manually (`source_type = 'manual'`). Participants go through `agenda_participants`.

### Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profile (name, email, phone, avatar). Created automatically via trigger on registration. |
| `user_roles` | Explicit roles (`site_admin`, `admin`, `staff`). One role per user. |
| `students` | Student registration. **Managed automatically** via triggers on `lesson_agreements`. Includes `date_of_birth` for VAT age logic. |
| `teachers` | Teacher registration. Links an `auth.users` row to a teacher record. |
| `lesson_types` | Lesson types (Guitar, Piano, …). Reference data, visible to all signed-in users. |
| `lesson_type_options` | Frequencies and rates per lesson type, with separate `price_per_lesson_under_21_cents` and `price_per_lesson_adult_cents`. |
| `lesson_agreements` | Lesson agreements between student and teacher. Day/time, start/end date, active status, notes, `stripe_schedule_id`. |
| `no_lesson_periods` | School holidays / no-lesson periods. Triggers **shift logic** in `calculateYearlyAmount` and `eventGenerators`. |
| `project_domains` / `project_labels` / `projects` | Hierarchical project structure with cost centre. Managed by admin/site_admin only. |
| `agenda_events` | Agenda items (manual, lesson, or project). Contains `source_type` / `source_id`, start/end, recurring. |
| `agenda_participants` | Links participants (`auth.users`) to agenda events. |
| `agenda_event_deviations` | Deviations on recurring events (reschedule, cancel, including `cancellation_type`). |
| `email_templates` | App-level transactional mail templates (`event_key`, `subject`, `body_html`, `is_enabled`). Managed via the Settings UI. |
| `stripe_customers` | 1:1 mapping `auth.users.id` ↔ `stripe_customer_id`. |
| `subscriptions` | Mirror of Stripe Subscription per `lesson_agreement_id` (status, period, payment method, `stripe_schedule_id`). |
| `subscription_invoices` | Mirror of Stripe Invoices (amount, status, hosted URL, period). |
| `direct_debit_invitations` | Audit of sent SEPA-onboarding magic links. |
| `accounting_settings` | Per-organisation VAT/ledger settings (`account_btw_21`, `btw_code_21`, `btw_code_exempt`, …). |
| `announcements` | Dashboard news (`title`, `body`, `audience[]`, `published_at`, `is_active`). Publicly readable once active and published; only staff/admin/site_admin can manage. Optional images in the `announcement-images` storage bucket (public, max 5 MB; only privileged users can upload). |

### Views

| View | Description |
|------|-------------|
| `view_profiles_with_display_name` | Profile data with computed `display_name`. Uses `security_invoker = on` so RLS on profiles is respected. |

---

## Roles and Permissions

The application uses role-based access control (RBAC) with these roles:

| Role | Description |
|------|-------------|
| `site_admin` | Full access; can manage all roles |
| `admin` | Can manage users and roles (except site_admin) |
| `staff` | Can view user data and manage lesson agreements |
| *(no role)* | Default user; own profile only |

> 📝 **Teachers and students** are **not** identified via `user_roles`, but via the `teachers` and `students` tables. A user can have both a role (admin/staff) and a teacher/student record.

### Role Management Permissions

| Action | admin | site_admin |
|--------|-------|------------|
| Assign roles (INSERT) | ✅ (not site_admin) | ✅ |
| Change roles (UPDATE) | ✅ (not site_admin) | ✅ |
| Remove roles (DELETE) | ✅ (not site_admin) | ✅ |
| Change own role | ❌ | ❌ |

> ⚠️ **Protection**: The last `site_admin` cannot be removed or demoted (database trigger).

---

## RLS Permissions per Table

### profiles

| Action | student | teacher | staff | admin | site_admin |
|--------|:-------:|:-------:|:-----:|:-----:|:----------:|
| SELECT | ✅ (own + own teachers) | ✅ (own + own students) | ✅ (all) | ✅ (all) | ✅ (all) |
| UPDATE | ✅ (own) | ✅ (own) | ✅ (all) | ✅ (all) | ✅ (all) |
| INSERT | ❌ (trigger) | ❌ (trigger) | ❌ (trigger) | ❌ (trigger) | ❌ (trigger) |
| DELETE | ❌ (cascade) | ❌ (cascade) | ❌ (cascade) | ❌ (cascade) | ❌ (cascade) |

> **Own teachers** = profiles of teachers with whom the student has a lesson agreement. **Own students** = profiles of students with whom the teacher has a lesson agreement.

### students

| Action | student | teacher | staff | admin | site_admin |
|--------|:-------:|:-------:|:-----:|:-----:|:----------:|
| SELECT | ✅ (own) | ✅ (own students) | ✅ | ✅ | ✅ |
| INSERT | ❌ | ❌ | ❌ | ❌ | ❌ |
| UPDATE | ❌ | ❌ | ❌ | ✅ | ✅ |
| DELETE | ❌ | ❌ | ❌ | ❌ | ❌ |

> **Own students** = students with whom the teacher has a lesson agreement. Students **cannot** be deleted manually; they are created/removed automatically via triggers on lesson_agreements.

### teachers

| Action | student | teacher | staff | admin | site_admin |
|--------|:-------:|:-------:|:-----:|:-----:|:----------:|
| SELECT | ✅ (own teachers) | ✅ (own) | ✅ | ✅ | ✅ |
| INSERT | ❌ | ❌ | ❌ | ✅ | ✅ |
| UPDATE | ❌ | ❌ | ❌ | ✅ | ✅ |
| DELETE | ❌ | ❌ | ❌ | ✅ | ✅ |

> **Own teachers** = teachers with whom the student has a lesson agreement.

### lesson_types

| Action | everyone (signed in) | staff | admin | site_admin |
|--------|:--------------------:|:-----:|:-----:|:----------:|
| SELECT | ✅ | ✅ | ✅ | ✅ |
| INSERT | ❌ | ❌ | ✅ | ✅ |
| UPDATE | ❌ | ❌ | ✅ | ✅ |
| DELETE | ❌ | ❌ | ✅ | ✅ |

### lesson_agreements

| Action | student | teacher | staff | admin | site_admin |
|--------|:-------:|:-------:|:-----:|:-----:|:----------:|
| SELECT | ✅ (own) | ✅ (own) | ✅ (all) | ✅ (all) | ✅ (all) |
| INSERT | ❌ | ❌ | ✅ | ✅ | ✅ |
| UPDATE | ❌ | ❌ | ✅ | ✅ | ✅ |
| DELETE | ❌ | ❌ | ✅ | ✅ | ✅ |

> **Own** = a student only sees agreements where they are the student; a teacher only sees agreements where they are the teacher.

---

## Helper Functions

| Function | Description | Security |
|----------|-------------|----------|
| `is_site_admin()` | Whether the **signed-in** user is site_admin | `SECURITY INVOKER` |
| `is_admin()` | Whether the signed-in user is admin | `SECURITY INVOKER` |
| `is_staff()` | Whether the signed-in user is staff | `SECURITY INVOKER` |
| `is_privileged()` | Staff, admin, or site_admin for the signed-in user (single query) | `SECURITY INVOKER` |
| `_has_role(uuid, app_role)` | Internal; only from other `SECURITY DEFINER` functions; **no** `GRANT` to `authenticated` | `SECURITY DEFINER` |
| `is_student(uuid)` / `is_teacher(uuid)` | Check for a student/teacher record | `SECURITY DEFINER` |
| `get_teacher_user_id(uuid)` | Resolve teacher user_id from user_id | `SECURITY DEFINER` |
| `can_delete_user(uuid)` | May the current session delete the given `user_id`? | `SECURITY DEFINER` |
| `can_manage_agenda_event(ev_id)` | May the current session manage a specific agenda event? | `SECURITY DEFINER` |
| `is_project_teacher(uuid)` / `is_project_participant(uuid)` | RLS helpers for projects | `SECURITY DEFINER` |
| `get_hours_report(start_date, end_date, user_id)` | Hours report plus financial breakdown per teacher/student, including VAT via `accounting_settings` and lesson-date age. | `SECURITY INVOKER` |
| `is_valid_phone_number(text)` | `IMMUTABLE`: NL mobile `06` + 8 digits; used by CHECK on e.g. `profiles.phone_number` | — |

> Public role checks (`is_admin()`, `is_privileged()`, …) are **`SECURITY INVOKER`** with a single `EXISTS` on `user_roles`. `can_manage_agenda_event` is **`SECURITY DEFINER`** and uses **`current_user_id()`** + **`is_privileged()`**. `_has_role` is not for clients. `profiles.email` is `UNIQUE` and follows `auth.users.email`. Phone rules are centralised in **`is_valid_phone_number`**.

---

## Automatic Lifecycle Management

### Students

Students are **managed automatically** via database triggers:

- **Create**: When a `lesson_agreement` is inserted, a `student` record is created for `student_user_id` if it does not already exist.
- **Delete**: When all `lesson_agreements` for a student are removed, the `student` record is deleted automatically.
- **No manual management**: Students **cannot** be created or deleted by hand, even by `site_admin`. There are no INSERT or DELETE policies on the `students` table.

**Design rationale**: Students are a **consequence** of lesson agreements, not a prerequisite. That avoids orphaned student records and keeps lifecycle automatic.

**CASCADE behaviour**:
- If an `auth.users` record is deleted, all related `lesson_agreements` are deleted (`ON DELETE CASCADE`).
- When all `lesson_agreements` are gone, the `student` is removed by the trigger.

---

## Security: SECURITY DEFINER Views and Functions

### Overview

PostgreSQL views and functions can use `SECURITY DEFINER`, which means they run with the owner's privileges (usually `postgres`) instead of the calling user. That can bypass RLS and is therefore a security risk.

### Mitigations

1. **Whitelist in baseline tests**: All SECURITY DEFINER views must be added explicitly to `ALLOWED_SECURITY_DEFINER_VIEWS` in `tests/rls/system/baseline.security.test.ts`. New views without `security_invoker = on` will fail CI.

2. **Required documentation**: Every SECURITY DEFINER view/function must document:
   - Why SECURITY DEFINER is needed
   - Which `auth.uid()` checks run
   - Which columns are exposed
   - A pointer to the relevant tests

3. **Automated tests**: Baseline security tests verify that:
   - No unexpected SECURITY DEFINER views exist
   - All allowed SECURITY DEFINER views are documented
   - Views with `security_invoker = on` respect RLS

### Allowed SECURITY DEFINER Views

None. All views use `security_invoker = on` or have been removed; students see their teachers via RLS on the `teachers` and `profiles` tables.

### Linter Warnings

The Supabase linter reports warnings for SECURITY DEFINER views. For views on the whitelist these are **false positives** because:
- Security is implemented explicitly via `auth.uid()` checks
- Tests in `tests/rls/` verify that unauthorized access is blocked
- A whitelist entry requires explicit approval

---

## Supabase Environments

This project uses three separate Supabase environments:

| Environment | Project ID | Use |
|-------------|------------|-----|
| **mcp-test** | `jserlqacarlgtdzrblic` | Test project: `bun dev:test` and **CI/PR checks** (workflow links via `SUPABASE_PROJECT_REF`) |
| **mcp-dev** | `zdvscmogkfyddnnxzkdu` | Development: Lovable / `bun dev`, and local `db:reset` |
| **Production** | `bnagepkxryauifzyoxgo` | Production deployment (`bun prod`) |

### How this works

1. **Lovable** is connected to **mcp-dev** — development database.
2. **Local testing** (`bun dev:test` or `bun test --bail rls`): use **mcp-test** or mcp-dev via `.env.test` (`SUPABASE_URL`, etc.).
3. **CI on a PR**: the **PR - Supabase** workflow (`pull-request-supabase.yml`) links to **mcp-test** (GitHub secret `SUPABASE_PROJECT_REF`), runs `supabase db reset --linked --yes`, and runs RLS/auth/e2e there when `supabase/**` or non-code tests change. See [secrets.md](./secrets.md) and [cicd-workflows.md](./cicd-workflows.md).
4. On **merge to main**, migrations are applied to production via `supabase db push`.
