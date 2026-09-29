# Secrets Configuration

## GitHub Secrets

Required for CI workflows. Manage via **[GitHub Actions Secrets → popschoolharderwijk/mcp](https://github.com/popschoolharderwijk/mcp/settings/secrets/actions)**.

| Secret | Value | Use |
|--------|-------|-----|
| `SUPABASE_ACCESS_TOKEN` | Access token from Supabase (Account → Access Tokens) | `supabase link` + `db reset --linked` in CI |
| `SUPABASE_DB_PASSWORD` | Database password of **mcp-test** (Project Settings → Database) | `db reset --linked` / CLI DB connection (bypasses a broken `cli_login_postgres` flow) |
| `SUPABASE_PROJECT_REF` | Project ref of **mcp-test** (`jserlqacarlgtdzrblic`) | CI links here |
| `SUPABASE_URL` | API URL of mcp-test | Test runtime |
| `SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Anon key of mcp-test | Test runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key of mcp-test | Test runtime |
| `RESEND_API_KEY` | API key from Resend.com | SMTP for Supabase Auth + `send-template-email` |

See [cicd-workflows.md](./cicd-workflows.md) for the PR workflow (**PR - Supabase** / `pull-request-supabase.yml`) that uses these secrets.

⚠️ **Never commit production or test keys!**

---

## Supabase Edge Function Secrets

Manage via **Supabase Dashboard → Project Settings → Edge Functions → Secrets** (per environment).

### Available automatically

| Variable | Source |
|----------|--------|
| `SUPABASE_URL` | Auto-injected |
| `SUPABASE_ANON_KEY` | Auto-injected |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected |
| `SUPABASE_DB_URL` | Auto-injected |

> 💡 Read these via `Deno.env.get(...)`. **Never** use a `VITE_` prefix.

### Project-specific secrets

| Secret | Required for | Description |
|--------|----------------|-------------|
| `RESEND_API_KEY` | `send-template-email`, `send-direct-debit-invite`, `approve-signup-request`, `schedule-trial-lesson`, `submit-signup-request` | Resend.com API key for transactional email. |
| `STRIPE_SECRET_KEY` | All Stripe edge functions | Server-side Stripe key (`sk_live_...` or `sk_test_...`). |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` | Signing secret of the webhook endpoint (Dashboard → Developers → Webhooks). |

See [integrations/stripe-direct-debit.md §9](./integrations/stripe-direct-debit.md) for the Stripe Dashboard checklist and [deployment.md](./deployment.md) for the full edge-function table.

---

## Dev Login Bypass (development/test only)

For fast sign-in without Magic Link in development. Add to `.env.development` or `.env.test`.

### Frontend (Dev Login button)

| Variable | Description |
|----------|-------------|
| `VITE_DEV_LOGIN_PASSWORD` | Password for direct login (empty → button disabled). |
| `VITE_DEV_LOGIN_EMAIL` | Optional: pre-fill the email field. |

### Script (`bun run create-user`)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | API URL of mcp-dev or mcp-test. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key. |
| `DEV_LOGIN_EMAIL`, `DEV_LOGIN_PASSWORD` | Credentials of the user to create. |
| `DEV_LOGIN_FIRST_NAME`, `DEV_LOGIN_LAST_NAME` | Optional: profile fields. |

Example `.env.development`:

```env
VITE_SUPABASE_URL=https://zdvscmogkfyddnnxzkdu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://zdvscmogkfyddnnxzkdu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...

VITE_DEV_LOGIN_PASSWORD=my-dev-password
DEV_LOGIN_EMAIL=dev@example.com
DEV_LOGIN_PASSWORD=my-dev-password
DEV_LOGIN_FIRST_NAME=Dev
DEV_LOGIN_LAST_NAME=User
```

Create the user with `bun run create-user`.

> ⚠️ `VITE_DEV_LOGIN_*` are **never** used in production: Vite dead-code elimination removes the button.
