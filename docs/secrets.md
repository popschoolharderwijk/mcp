# Secrets Configuration

## Local layout (`SECRETS_PATH`)

Secret values do **not** live in the git repo. Copy the tracked template and point at your secrets folder:

```bash
cp .env.example .env
```

```env
# .env.example (tracked) → .env (gitignored)
SECRETS_PATH=../mcp-secrets
```

Resolve relative paths against the project root. Absolute paths are allowed. Override with a real `SECRETS_PATH` environment variable when needed.

**CI** does not use `SECRETS_PATH` or `mcp-secrets`. Workflows inject `SUPABASE_*` / `RESEND_*` via GitHub Actions secrets into the job environment. Bun preload skips file loading when no local `.env` pointer is present.

Typical sibling folder:

```text
../mcp-secrets/
  .env                         # DEV_LOGIN_* for bun run create-user
  .env.local                   # Bun scripts when NODE_ENV is unset (local stack)
  .env.development.local
  .env.test.local
  .env.production.local
  supabase/
    .env.local                 # Edge/Auth SoT (local)
    .env.development           # Edge/Auth SoT (mcp-dev) when used
    .env.test
    .env.production
```

Loaders:

- **Vite** — committed `.env.development` / `.env.localdev` / `.env.test` / `.env.production` supply public keys. Optional secrets overlay for remote modes only: `$SECRETS_PATH/.env.<mode>.local`. Mode `localdev` has no SECRETS_PATH overlay.
- **Bun** — preload loads `$SECRETS_PATH/.env` plus one runtime file (`NODE_ENV=test` → `.env.test.local`, `production` → `.env.production.local`, `development` → `.env.development.local`, unset → `.env.local`). Every key in those files is copied into `process.env`, including `VITE_*`.
- **`bun run db:*`** — hosted `SUPABASE_DB_PASSWORD` comes from `$SECRETS_PATH/.env.<target>.local` when that file exists, otherwise from the process env (CI). A missing `SECRETS_PATH` does not block that lookup. `db:push:secrets` still requires the pointer and the Edge SoT file. Local materialize writes gitignored `supabase/functions/.env` and `supabase/.env`.

Git ignores every `.env*` path. Tracked exceptions, repo root only: `.env.example`, `.env.development`, `.env.localdev`, `.env.test`, `.env.production`.

See [commands.md](./commands.md).

---

## GitHub Secrets

Required for CI workflows. Manage via **[GitHub Actions Secrets → popschoolharderwijk/mcp](https://github.com/popschoolharderwijk/mcp/settings/secrets/actions)**.

| Secret                             | Value                                                           | Use                                                             |
| ---------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN`            | Access token from Supabase (Account → Access Tokens)            | CI / remote CLI (`--remote=<ref>`)                              |
| `SUPABASE_DB_PASSWORD`             | Database password of **mcp-test** (Project Settings → Database) | CI + `bun run db:* test` (same plain name as `.env.test.local`) |
| `SUPABASE_PROJECT_REF`             | Project ref of **mcp-test** (`supabase.json` → `targets.test`)  | CI `--remote=$SUPABASE_PROJECT_REF`                             |
| `SUPABASE_URL`                     | API URL of mcp-test                                             | Test runtime                                                    |
| `SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Anon key of mcp-test                                            | Test runtime                                                    |
| `SUPABASE_SERVICE_ROLE_KEY`        | Service role key of mcp-test                                    | Test runtime                                                    |
| `RESEND_API_KEY`                   | API key from Resend.com                                         | SMTP for Supabase Auth + `send-template-email`                  |

See [cicd-workflows.md](./cicd-workflows.md) for the PR workflow (**PR - Supabase** / `pull-request-supabase.yml`) that uses these secrets.

⚠️ **Never commit production or test keys!**

---

## Supabase Edge Function Secrets

**Preferred:** `bun run db:push:secrets` + env files under `$SECRETS_PATH/supabase/`. Do not use the Dashboard as source of truth.

`db:push:secrets` on remotes **replaces** custom secrets from the env file (stale keys are dropped after confirm). Bare `supabase secrets unset` (no names) deletes **all** custom secrets — avoid.

### Available automatically

| Variable                    | Source        |
| --------------------------- | ------------- |
| `SUPABASE_URL`              | Auto-injected |
| `SUPABASE_ANON_KEY`         | Auto-injected |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected |
| `SUPABASE_DB_URL`           | Auto-injected |

> 💡 Read these via `Deno.env.get(...)`. **Never** use a `VITE_` prefix.

### Project-specific secrets

| Secret                  | Required for                                                            | Description                                                                 |
| ----------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `RESEND_API_KEY`        | Auth SMTP + Edge (`send-template-email`, checkout/signup/trial mail, …) | Resend API key (SMTP password + HTTP API).                                  |
| `RESEND_FROM_EMAIL`     | Edge transactional mail                                                 | From-address for app mail.                                                  |
| `STRIPE_SECRET_KEY`     | All Stripe edge functions                                               | Server-side Stripe key (`sk_live_...` or `sk_test_...`).                    |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook`                                                        | Signing secret of the webhook endpoint (Dashboard → Developers → Webhooks). |

See [integrations/stripe-billing.md §9](./integrations/stripe-billing.md) for the Stripe Dashboard checklist and [deployment.md](./deployment.md) for the full edge-function table.

---

## Dev Login Bypass (development/test only)

For fast sign-in without Magic Link in development. Add to `$SECRETS_PATH/.env.development.local` (mcp-dev) or `$SECRETS_PATH/.env.local` (Bun scripts / local stack tooling) — never to committed mode files.

### Frontend (Dev Login button)

| Variable                  | Description                                          |
| ------------------------- | ---------------------------------------------------- |
| `VITE_DEV_LOGIN_PASSWORD` | Password for direct login (empty → button disabled). |
| `VITE_DEV_LOGIN_EMAIL`    | Optional: pre-fill the email field.                  |

### Script (`bun run create-user`)

| Variable                                      | Description                                                     |
| --------------------------------------------- | --------------------------------------------------------------- |
| `SUPABASE_URL`                                | API URL (local `http://127.0.0.1:54421`, mcp-dev, or mcp-test). |
| `SUPABASE_SERVICE_ROLE_KEY`                   | Service role key.                                               |
| `DEV_LOGIN_EMAIL`, `DEV_LOGIN_PASSWORD`       | Credentials of the user to create.                              |
| `DEV_LOGIN_FIRST_NAME`, `DEV_LOGIN_LAST_NAME` | Optional: profile fields.                                       |

Example `$SECRETS_PATH/.env.development.local`:

```env
SUPABASE_URL=https://<development-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_DB_PASSWORD=...

VITE_DEV_LOGIN_PASSWORD=my-dev-password
DEV_LOGIN_EMAIL=dev@example.com
DEV_LOGIN_PASSWORD=my-dev-password
DEV_LOGIN_FIRST_NAME=Dev
DEV_LOGIN_LAST_NAME=User
```

Put shared `DEV_LOGIN_*` defaults in `$SECRETS_PATH/.env` if you prefer. Create the user with `bun run create-user`.

> ⚠️ `VITE_DEV_LOGIN_*` are **never** used in production: Vite dead-code elimination removes the button.
