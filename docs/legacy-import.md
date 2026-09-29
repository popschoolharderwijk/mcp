# Legacy data import

Import **lesson types (+ options)**, **teachers**, **students**, and **active agreements** from a previous system via an Excel file. The import is idempotent: importing the same row again changes nothing, and existing records are updated instead of duplicated.

## Scope

In scope:

- `lesson_types` + `lesson_type_options`
- `teachers` (including subjects via `teacher_lesson_types`)
- `students` (including parent/debtor fields)
- `lesson_agreements` (active agreements)

Out of scope (intentionally):

- Stripe mandates or subscriptions — non-Stripe direct debit is re-invited per student after import via the existing SEPA flow (`incasso_invitations`).
- Historical agenda events, deviations, and cancellations.
- Historical invoices.
- Welcome emails — accounts are created without a password; users sign in later via the existing magic-link flow.

## How to run it

1. Open **Instellingen → Data-import** (visible only to `admin` / `site_admin`).
2. Click **Download template** for an empty `.xlsx` with the correct sheet names and columns.
3. Fill the file with data from the old system. One sheet per entity; column order does not matter, column names do.
4. Upload the file and click **Valideren**. Errors appear row by row; you can import only when there are 0 errors.
5. Click **Importeren** and confirm. The result per entity (`created` / `updated` / `failed`) appears below; failed rows can be downloaded as CSV.

## Idempotence

For each imported row a mapping `legacy_id → new uuid` is stored in `public.legacy_ids`. On a second run:

- A known `legacy_id` triggers an `UPDATE` of the existing record.
- An unknown `legacy_id` triggers an `INSERT` plus a new mapping row.
- For teachers/students the import first checks whether the email already has an `auth.users` row; existing accounts are reused.

## Sheets and columns

| Sheet | Columns |
|---|---|
| `lesson_types` | `legacy_id, name, icon, color, is_group_lesson, cost_center, description, is_active` |
| `lesson_type_options` | `legacy_id, lesson_type_legacy_id, frequency, duration_minutes, price_per_lesson, price_per_lesson_adult_cents, price_per_lesson_under_21_cents` |
| `teachers` | `legacy_id, email, first_name, last_name, phone_number, bio, is_active, lesson_type_legacy_ids` (pipe-separated) |
| `students` | `legacy_id, email, first_name, last_name, phone_number, date_of_birth, parent_name, parent_email, parent_phone_number, debtor_info_same_as_student, debtor_name, debtor_address, debtor_postal_code, debtor_city` |
| `lesson_agreements` | `legacy_id, student_legacy_id, teacher_legacy_id, lesson_type_legacy_id, duration_minutes, frequency, price_per_lesson, day_of_week, start_time, start_date, end_date, notes, signup_source` |

Allowed values:

- `frequency` ∈ `daily | weekly | biweekly | monthly`
- `day_of_week` ∈ `0..6` (0 = Sunday)
- `icon` = name from `react-icons/lu` (e.g. `LuPiano`)
- `color` = hex or Tailwind colour token
- Dates = `YYYY-MM-DD`, times = `HH:MM` or `HH:MM:SS`

## Follow-up: direct debit

After a successful import all agreements are `is_active = true` with empty Stripe fields. Send a new invitation via **Leerlingen → SEPA-uitnodiging** per student (or in batch) to set up direct debit again.

## Troubleshooting

- **"Geen rechten voor data-import"** — your role is not `admin` or `site_admin`.
- **Unknown `lesson_type_legacy_id` / `student_legacy_id` / `teacher_legacy_id`** — the reference is not in an earlier sheet. Check spelling.
- **Email already exists** — not a problem; the existing account is reused and the mapping updated.
- **Files too large** — split the Excel by entity; the mapping keeps subsequent runs consistent.
