# Useful Commands

## Development Environments

| Command             | Environment        | Env file           | Use                                                                               |
| ------------------- | ------------------ | ------------------ | --------------------------------------------------------------------------------- |
| `bun dev`           | Remote development | `.env.development` | Shared mcp-dev / Lovable (default `dev` script)                                   |
| `bun run dev:local` | Local              | `.env.localdev`    | Native Supabase (`supabase start`); Vite port **8081** (beside `bun dev` on 8080) |
| `bun run dev:test`  | Test database      | `.env.test`        | Remote mcp-test                                                                   |
| `bun prod`          | Production         | `.env.production`  | Production server                                                                 |

Vite forbids **mode name** `local` (it would clash with the `.env.local` postfix). The script therefore uses mode **`localdev`**. Committed `.env.localdev` holds the local public keys — no `SECRETS_PATH` needed for `bun run dev:local`. Remote modes can overlay from `$SECRETS_PATH/.env.<mode>.local` (see [secrets.md](./secrets.md)).

### Creating env files

**Local pointer** (gitignored; copy from tracked `.env.example`):

```bash
cp .env.example .env
```

```env
# .env
SECRETS_PATH=../mcp-secrets
```

**Committed** mode files hold only public Vite values (URL + publishable key):

```env
# .env.development / .env.test / .env.production
VITE_SUPABASE_URL=https://….supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_…

# .env.localdev (publishable key + fallback URL; the browser uses the Vite origin)
VITE_SUPABASE_URL=http://127.0.0.1:54421
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_…
```

**Runtime secrets** under `SECRETS_PATH` — used by remote Vite overlays, `db:*`, and Bun preload (not required for `bun run dev:local`):

```env
# $SECRETS_PATH/.env.development.local / .env.test.local / .env.production.local
SUPABASE_URL=https://….supabase.co
SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_…
SUPABASE_SERVICE_ROLE_KEY=…
SUPABASE_DB_PASSWORD=…          # required for bun run db:* on that target
VITE_DEV_LOGIN_PASSWORD=…       # optional; keep out of committed mode files
```

**`$SECRETS_PATH/.env.local`** (Bun scripts when `NODE_ENV` is unset — `create-user`, `stripe:reset:customers`, etc.):

```env
SUPABASE_URL=http://127.0.0.1:54421
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase status>
VITE_DEV_LOGIN_PASSWORD=password
```

This project uses **non-default** local ports (offset +100: API `54421`, DB `54422`, Studio `54423`, Mailpit `54424`, analytics `54427`/`54428`, pooler `54429`). The local stack is the CLI native runtime (`[experimental] stack = true`). The container command runs `supabase start --runtime native --eager`, then `docker/forward-native-ports.sh` (`socat`) so Docker-published host ports reach the loopback-only native listeners. `bun run dev:local` also proxies `/auth`, `/rest`, `/storage`, `/functions`, `/realtime`, and `/mcp` through Vite on **8081** to `127.0.0.1:54421`, so the browser does not need a working host→API publish. Docker runs that on every container start. After `supabase stop` inside a running container, use `bun run supabase:restart` (same flags, including `--eager`). Stop the running stack before switching git branches: the branch is part of the project identity, and the next start uses the same fixed ports. If the committed local publishable key drifts, update `.env.localdev` from `supabase status`. Local magic-link mail is GoTrue's built-in template (`ConfirmationURL`). The custom HTML in `docs/email-templates/magic-link.html` is referenced from each `[remotes.*.auth.email.template.magic_link]`. For Auth SMTP + Edge secrets, use `$SECRETS_PATH/supabase/.env.local` and `bun run db:push:secrets` — not the Vite runtime files.

> 💡 Secret values live under `SECRETS_PATH`. Committed `.env.development` / `.env.localdev` / `.env.test` / `.env.production` must never hold service role keys or DB passwords.

### Local stack day-to-day

```bash
bun run supabase:restart   # stop → start --runtime native --eager (reloads functions/.env)
# optional: fill $SECRETS_PATH/supabase/.env.local (Resend/Stripe), then:
bun run db:push:secrets
bun run db:reset
bun run stripe:reset:customers    # wipe Stripe customers + local billing mirrors (local|dev|test; never prod)
bun run stripe:setup:webhooks     # create/update Event Destination (local|dev|test|prod; local → CLI listen help)
bun run dev:local
# Stripe webhooks (separate terminal; keep running):
bun run stripe:webhook
# Mirrors to terminal + logs/stripe.log ([HH:mm:ss] via console clock, log level once at top, secrets hint-redacted; optional --log-level / --log-exclude / --log-terminal off)
```

Types from the local stack (`supabase start` first):

```bash
bun run db:types
```

`db:types` uses `--remote=postgresql://postgres:postgres@localhost:54422/postgres`, the fixed `[db] port` from `config.toml`.

---

## Git Branch Management

```bash
# Reset lovable branch to main (loses Lovable history awareness!)
git checkout -B lovable origin/main
git push -u origin lovable --force

# Complete history reset (orphan branch) - DESTRUCTIVE
git checkout main
git pull origin main
git checkout --orphan temp-main
git add -A
git commit -m "Initial commit"
git branch -D main
git branch -m main
git push --force origin main
```

---

## Supabase DB deploy (`bun run db:*`)

Prefer these over raw CLI. Missing env → **`local`**. Targets: `local` | `development` (`dev`) | `test` | `production` (`prod`). Remotes use `--remote=<ref>` from root [`supabase.json`](../supabase.json) (never ambient link). CLI auth: `supabase login` or `SUPABASE_ACCESS_TOKEN`. Hosted DB commands read plain `SUPABASE_DB_PASSWORD` from `$SECRETS_PATH/.env.<target>.local` (or the process env, e.g. CI). Remotes use `--remote=<ref>`; scripts run `supabase unlink` first when a link exists so the password applies to that ref. `db:push:migrations` also passes `--password`; `db:reset` / `db:types` pass the password via env. Edge/Auth SoT lives under `$SECRETS_PATH/supabase/`.

| Command                            | `local`                                                                                         | `development` / `test` / `production`                                                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `bun run db:reset [env]`           | `supabase db reset`                                                                             | `db reset --remote=<ref>` (script + CLI interactive confirm via TTY)                                                             |
| `bun run db:push:migrations [env]` | `migration up`                                                                                  | `db push --remote=<ref>` (CLI interactive confirm via TTY)                                                                       |
| `bun run db:push:secrets [env]`    | Materialize in-repo `functions/.env` + `supabase/.env` from `$SECRETS_PATH/supabase/.env.local` | Replace custom secrets from `$SECRETS_PATH/supabase/.env.development` / `.test` / `.production` (CLI confirm; stale drop prompt) |
| `bun run db:push:config [env]`     | No-op (uses `config.toml` via `supabase start`)                                                 | `config push --remote=<ref>` (prints diff; interactive CLI confirm via TTY)                                                      |
| `bun run db:push:functions [env]`  | No-op (serves from tree)                                                                        | `functions deploy --remote=<ref>` (CLI interactive confirm via TTY)                                                              |
| `bun run db:push:all [env]`        | Fail-fast: migrations → secrets → config → functions                                            | Same order (no reset)                                                                                                            |
| `bun run db:types [env]`           | `gen types` via localhost DB URL                                                                | `gen types --remote=<ref>`                                                                                                       |

```bash
bun run db:push:secrets                 # local SoT → derived files
bun run db:push:all development         # mcp-dev
bun run db:reset                        # local stack
bun run db:types                        # after local reset / schema change
bun run db:types development            # types from mcp-dev
bun run db:types dev                    # same as development
bun run db:types prod                   # same as production
```

## Supabase CLI (raw)

```bash
# Local stack (after supabase start)
supabase db reset
bun run db:types

# Prefer bun run db:* above. Raw remotes need an explicit target from supabase.json, e.g.:
supabase db push --remote=<development-project-ref> --yes
supabase config push --remote=<development-project-ref>
supabase secrets list --remote=<development-project-ref>
supabase gen types typescript --remote=<development-project-ref> --schema public
```

> 💡 **Workflow**: Default UI / Lovable is **mcp-dev** (`bun dev`). The local stack is `bun run dev:local`. **CI on a PR** uses **mcp-test** via `--remote=$SUPABASE_PROJECT_REF`. For `bun test tests/rls`: put credentials in `$SECRETS_PATH/.env.test.local` (or the shell). See [secrets.md](./secrets.md) and [architecture.md](./architecture.md). Requires **Supabase CLI v3+**.

---

## User Management

```bash
# Create a new user (or update an existing one)
# Local stack (NODE_ENV unset): $SECRETS_PATH/.env.local
# mcp-dev: NODE_ENV=development and $SECRETS_PATH/.env.development.local
# Shared defaults: $SECRETS_PATH/.env or the shell
#   SUPABASE_URL=https://...supabase.co          (required, API URL; local: http://127.0.0.1:54421)
#   SUPABASE_SERVICE_ROLE_KEY=eyJ...             (required, service role key)
#   DEV_LOGIN_EMAIL=user@example.com             (required, for create-user script)
#   DEV_LOGIN_PASSWORD=password                  (optional, omit = passwordless user)
#   DEV_LOGIN_FIRST_NAME=First                   (optional)
#   DEV_LOGIN_LAST_NAME=Last                     (optional)
bun run create-user
```

**Two modes:**

- **With password**: User can sign in via the Dev Login button and Magic Link/OTP
- **Without password**: User can only sign in via Magic Link/OTP

> 💡 For an existing user, password and name are updated (in both `auth.users` and the `profiles` table).

---

## Dev Login Bypass

In non-production environments a "Dev Login" button appears on the login page. Use it to sign in immediately without waiting for Magic Link/OTP.

### Role selection

The Dev Login button has a dropdown to choose a role:

- **Site Admin** (`site-admin@test.nl`) - Selected by default
- **Admin** (`admin-one@test.nl`)
- **Teacher** (`teacher-alice@test.nl`)
- **Staff** (`staff-one@test.nl`)
- **Student** (`student-001@test.nl`)
- **User (no role)** (`user-001@test.nl`)

These users come from the test seed (`supabase/seeds/test.sql`) and are available after `supabase db reset` (local) or a remote reset with seeds.

### Configuration

**Optional** — add to `$SECRETS_PATH/.env.local` or `$SECRETS_PATH/.env.development.local` if you want a custom password:

```env
VITE_DEV_LOGIN_PASSWORD=your-custom-password
```

If `VITE_DEV_LOGIN_PASSWORD` is not set, the Dev Login button is disabled. Test-seed users in `supabase/seeds/test.sql` use the password `password` by default.

> 💡 **Note**: The Dev Login button uses hardcoded emails from `supabase/seeds/test.sql` (e.g. `site-admin@test.nl`). Those emails are not configurable via environment variables. For custom users use `bun run create-user` with `DEV_LOGIN_EMAIL`.

### Security

- The Dev Login button is **fully removed** from production builds (Vite dead-code elimination)
- Works only when Vite mode is not `production`
- Extra runtime check as a fallback

---

## Testing

```bash
# Unit tests (no Supabase needed). Uses --isolate so mock.module cannot leak across files.
bun run test:code

# Single file / filter (add --isolate yourself if the file mocks shared modules)
bun test tests/code/auth/devLoginAttempt.test.ts --isolate

# Agenda logic (recurrence, frequency, deviations; no Supabase needed)
bun test agenda

# RLS / auth / e2e (against mcp-test, mcp-dev, or local; requires SUPABASE_* and VITE_DEV_LOGIN_PASSWORD in env)
# Use path prefixes — bare `auth` also matches tests/code/auth/
bun test tests/rls
bun test tests/auth
bun test tests/e2e

# All tests (not isolated — prefer bun run test:code for tests/code)
bun test
```

---

## Linting

```bash
# TypeScript/JS (Biome)
bun run check                 # Check (no writes)
bun run fix                   # Fix (format + lint autofix)

# Quality gates (CI)
bun run check:ci              # Biome CI + tsc + code tests
bun run check:fallow          # Fallow (dead code, duplication, complexity)
bun run check:fallow:audit    # Fallow audit (changed-file gate; PR CI)

# SQL migrations (Squawk)
bun run lint:sql

# PL/pgSQL functions (against the linked remote database; warnings and errors fail)
bun run lint:db
```

> 📖 See [cicd-workflows.md](./cicd-workflows.md#linting) for full documentation of all linters.
