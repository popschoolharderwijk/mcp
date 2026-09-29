# Secrets Configuratie

## GitHub Secrets

Nodig voor CI workflows. Beheer via **[GitHub Actions Secrets → popschoolharderwijk/mcp](https://github.com/popschoolharderwijk/mcp/settings/secrets/actions)**.

| Secret | Waarde | Gebruik |
|--------|--------|---------|
| `SUPABASE_ACCESS_TOKEN` | Access token uit Supabase (Account → Access Tokens) | `supabase link` + `db reset --linked` in CI |
| `SUPABASE_DB_PASSWORD` | Database password van **mcp-test** (Project Settings → Database) | `db reset --linked` / CLI DB-connectie (omzeilt kapotte `cli_login_postgres`-flow) |
| `SUPABASE_PROJECT_REF` | Project ref van **mcp-test** (`jserlqacarlgtdzrblic`) | CI linkt hiernaar |
| `SUPABASE_URL` | API URL van mcp-test | Test runtime |
| `SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Anon key van mcp-test | Test runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key van mcp-test | Test runtime |
| `RESEND_API_KEY` | API key van Resend.com | SMTP voor Supabase Auth + `send-template-email` |

Zie [cicd-workflows.md](./cicd-workflows.md) voor de PR-workflow (**pull-request-test-code-and-supabase**) die deze secrets gebruikt.

⚠️ **Commit nooit production of test keys!**

---

## Supabase Edge Function Secrets

Beheer via **Supabase Dashboard → Project Settings → Edge Functions → Secrets** (per omgeving).

### Automatisch beschikbaar

| Variabele | Bron |
|-----------|------|
| `SUPABASE_URL` | Auto-injected |
| `SUPABASE_ANON_KEY` | Auto-injected |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected |
| `SUPABASE_DB_URL` | Auto-injected |

> 💡 Lees deze via `Deno.env.get(...)`. **Nooit** met `VITE_` prefix gebruiken.

### Project-specifieke secrets

| Secret | Verplicht voor | Beschrijving |
|--------|----------------|--------------|
| `RESEND_API_KEY` | `send-template-email`, `send-direct-debit-invite`, `approve-signup-request`, `schedule-trial-lesson`, `submit-signup-request` | API key Resend.com voor transactionele e-mail. |
| `STRIPE_SECRET_KEY` | Alle Stripe edge functions | Server-side Stripe key (`sk_live_...` of `sk_test_...`). |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` | Signing secret van het webhook endpoint (Dashboard → Developers → Webhooks). |

Zie [integrations/stripe-direct-debit.md §9](./integrations/stripe-direct-debit.md) voor de Stripe Dashboard checklist en [deployment.md](./deployment.md) voor de volledige edge-function tabel.

---

## Dev Login Bypass (alleen development/test)

Voor snel inloggen zonder Magic Link in development. Toevoegen aan `.env.development` of `.env.test`.

### Frontend (Dev Login knop)

| Variabele | Beschrijving |
|-----------|--------------|
| `VITE_DEV_LOGIN_PASSWORD` | Wachtwoord voor directe login (leeg → knop disabled). |
| `VITE_DEV_LOGIN_EMAIL` | Optioneel: pre-fill van het e-mailveld. |

### Script (`bun run create-user`)

| Variabele | Beschrijving |
|-----------|--------------|
| `SUPABASE_URL` | API URL van mcp-dev of mcp-test. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key. |
| `DEV_LOGIN_EMAIL`, `DEV_LOGIN_PASSWORD` | Inloggegevens van de aan te maken user. |
| `DEV_LOGIN_FIRST_NAME`, `DEV_LOGIN_LAST_NAME` | Optioneel: profiles-velden. |

Voorbeeld `.env.development`:

```env
VITE_SUPABASE_URL=https://zdvscmogkfyddnnxzkdu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://zdvscmogkfyddnnxzkdu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...

VITE_DEV_LOGIN_PASSWORD=mijn-dev-wachtwoord
DEV_LOGIN_EMAIL=dev@example.com
DEV_LOGIN_PASSWORD=mijn-dev-wachtwoord
DEV_LOGIN_FIRST_NAME=Dev
DEV_LOGIN_LAST_NAME=User
```

Maak de user aan met `bun run create-user`.

> ⚠️ `VITE_DEV_LOGIN_*` worden **nooit** gebruikt in production: de knop wordt door Vite's dead-code elimination verwijderd.
