# Email templates & SMTP

The application has **two** layers of email templates:

1. **Supabase Auth emails** (Magic Link / OTP) — managed via `supabase/config.toml` and the Supabase Dashboard. Files in `docs/email-templates/`.
2. **App-level transactional emails** — stored in the database (`email_templates`) and managed in the app via **Settings → E-mailtemplates** (`EmailTemplatesManager`).

Both use the same SMTP provider (Resend).

---

## 1. Supabase Auth emails (Magic Link)

### Where to configure

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → project (dev/test/prod).
2. **Authentication → Email → Magic Link**.
3. Paste the contents of `docs/email-templates/magic-link.html` into the Body field.
4. Subject: `[DEV] Je inloglink voor de Mplify Community Portal` (mcp-dev / mcp-test) or `Je inloglink` (production). Source: `supabase/config.toml`.

> ⚠️ Do this for **every** Supabase environment (mcp-dev, mcp-test, production). Templates are not synced automatically.

### Available variables

| Variable | Description |
|----------|-------------|
| `{{ .ConfirmationURL }}` | Full Magic Link URL |
| `{{ .Token }}` | OTP code |
| `{{ .TokenHash }}` | Hash of the token (for URLs) |
| `{{ .SiteURL }}` | Configured Site URL |
| `{{ .Email }}` | User email address |

The Stripe direct-debit flow uses its own variant with `token_hash` format — see [stripe-direct-debit.md §5](integrations/stripe-direct-debit.md).

---

## 2. App-level email templates (database-backed)

Manage via the UI: **Settings → E-mailtemplates** (`src/components/settings/EmailTemplatesManager.tsx`).

### Data model

Table `email_templates` (migration `20260513085233`):

| Column | Purpose |
|--------|---------|
| `event_key` | Unique event key (e.g. `direct_debit_invite`, `signup_approved`). |
| `subject` | Subject line; supports `{{variable}}` interpolation. |
| `body_html` | HTML body with the same variables. |
| `is_enabled` | Whether the template is active. Disabled = no mail sent. |
| `updated_at` | Last changed. |

RLS: only `is_privileged()` (admin/staff) may read/write.

### Which events exist

Defined in `supabase/functions/_shared/email-events.ts`. Each entry describes:
- `eventKey` — link to `email_templates.event_key`
- `label` + `description` — shown in the manager
- `variables` — which placeholders are available

`EmailTemplatesManager` shows each event as a **collapsible** item; content (subject, body, preview, test send) loads only when opened so the overview stays calm.

### Send flow

Edge function `send-template-email` (`supabase/functions/send-template-email/index.ts`):

1. Receives `{ eventKey, to, variables }` (JWT required; privileged or service-role only).
2. Loads the template from `email_templates` where `event_key = ?` and `is_enabled = true`.
3. Fills variables (`{{name}}` → value).
4. Sends via Resend with `RESEND_API_KEY`.

Other edge functions (`send-direct-debit-invite`, `approve-signup-request`, `schedule-trial-lesson`, …) use the same helper internally.

### Testing from the UI

In the manager you can send a **test mail** per template to your own signed-in address. Placeholder sample values come from `email-events.ts`.

---

## 3. Custom SMTP (Resend)

We use [Resend](https://resend.com) for both Supabase Auth mail and app mail.

### Configuration via `supabase/config.toml`

All SMTP settings live in `[auth.email.smtp]` and are pushed to remote projects — **no manual Dashboard config needed**.

> 📝 `pass = "env(RESEND_API_KEY)"` means the key is read from an environment variable. Ensure `RESEND_API_KEY` is in `.env.development`, GitHub Secrets, **and** Supabase Edge Function Secrets.

### Setup

1. Create an account at [resend.com](https://resend.com).
2. **Settings → API Keys** → new key.
3. **Settings → Domains** → verify domain (DNS records).
4. Add `RESEND_API_KEY=re_xxx...` to `.env.development`.

### Push SMTP

```bash
supabase link --project-ref <project-id>
supabase config push  # review diff, type Y
```

> ⚠️ The sender email (`admin_email`) must be a verified domain in Resend. For development, `xxx@resend.dev` (test domain) is allowed.

---

## 4. Project IDs (where to set SMTP and templates)

| Environment | Project ref |
|-------------|-------------|
| Development | `zdvscmogkfyddnnxzkdu` |
| Test (CI) | `jserlqacarlgtdzrblic` |
| Production | `bnagepkxryauifzyoxgo` |
