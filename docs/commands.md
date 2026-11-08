# Useful Commands

## Development Environments

| Command             | Environment        | Env file                   | Use                                                                               |
| ------------------- | ------------------ | -------------------------- | --------------------------------------------------------------------------------- |
| `bun dev`           | Remote development | `.env.development`         | Shared mcp-dev / Lovable (default `dev` script)                                   |
| `bun run dev:local` | Local              | `$SECRETS_PATH/.env.local` | Docker Supabase (`supabase start`); Vite port **8081** (beside `bun dev` on 8080) |
| `bun run dev:test`  | Test database      | `.env.test`                | Remote mcp-test                                                                   |
| `bun prod`          | Production         | `.env.production`          | Production server                                                                 |

Vite forbids **mode name** `local` (it would clash with the `.env.local` postfix). The script therefore uses mode **`localdev`**. Secret overlays live under `SECRETS_PATH` (see [secrets.md](./secrets.md)). For `bun dev`, committed `.env.development` supplies public keys; `$SECRETS_PATH/.env.development.local` can overlay. `$SECRETS_PATH/.env.local` is applied only for mode `localdev`.

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
```

**Runtime secrets** under `SECRETS_PATH` — used by Vite overlays, `db:*`, and Bun preload:

```env
# $SECRETS_PATH/.env.development.local / .env.test.local / .env.production.local
SUPABASE_URL=https://….supabase.co
SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_…
SUPABASE_SERVICE_ROLE_KEY=…
SUPABASE_DB_PASSWORD=…          # required for bun run db:* on that target
VITE_DEV_LOGIN_PASSWORD=…       # optional; keep out of committed mode files
```

**`$SECRETS_PATH/.env.local`** (local Docker — Vite `dev:local`, and Bun scripts when `NODE_ENV` is unset):

```env
VITE_SUPABASE_URL=http://127.0.0.1:54421
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key from supabase status>
VITE_DEV_LOGIN_PASSWORD=password
SUPABASE_URL=http://127.0.0.1:54421
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase status>
```

(`supabase status` prints `VITE_SUPABASE_PUBLISHABLE_KEY`. Remote mode files may use `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` — the client accepts either.)

This project uses **non-default** local ports (offset +100: API `54421`, DB `54422`, Studio `54423`, Mailpit `54424`, analytics `54427`/`54428`, pooler `54429`) so it can run beside other `supabase start` stacks. Copy keys from `supabase status` after `supabase start`. For Auth SMTP + Edge secrets, use `$SECRETS_PATH/supabase/.env.local` and `bun run db:push:secrets` — not the Vite runtime files.

> 💡 Secret values live under `SECRETS_PATH`. Committed `.env.development` / `.env.test` / `.env.production` must never hold service role keys or DB passwords.

### Local Docker day-to-day

```bash
supabase start
# fill $SECRETS_PATH/.env.local from supabase status (Vite + Bun scripts)
# fill $SECRETS_PATH/supabase/.env.local (Resend/Stripe), then:
bun run db:push:secrets
bun run db:reset
bun run dev:local
```

Types from the local stack (`supabase start` first):

```bash
bun run db:types
```

Default local `supabase gen types` can fail here with
`password authentication failed` when another local stack is also running
(CLI rewrites to Docker alias `db:5432` — see supabase/cli#5283). `db:types`
uses `--remote=postgresql://postgres:postgres@localhost:54422/postgres`
(`localhost`, not `127.0.0.1`) so typegen stays on host networking (~2s).

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

Prefer these over raw CLI. Missing env → **`local`**. Targets match Vite mode names: `local` | `development` | `test` | `production`. Remotes use `--remote=<ref>` from a fixed map (never ambient link). CLI auth: `supabase login` or `SUPABASE_ACCESS_TOKEN`. Hosted DB commands read plain `SUPABASE_DB_PASSWORD` from `$SECRETS_PATH/.env.<target>.local` (or the process env, e.g. CI). Remotes use `--remote=<ref>`; scripts run `supabase unlink` first when a link exists so the password applies to that ref. `db:push:migrations` also passes `--password`; `db:reset` / `db:types` pass the password via env. Edge/Auth SoT lives under `$SECRETS_PATH/supabase/`.

| Command                            | `local`                                                                                         | `development` / `test` / `production`                                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `bun run db:reset [env]`           | `supabase db reset`                                                                             | `db reset --remote=<ref> --yes` (`confirm` targets prompt first)                                                        |
| `bun run db:push:migrations [env]` | `migration up`                                                                                  | `db push --remote=<ref> --yes`                                                                                          |
| `bun run db:push:secrets [env]`    | Materialize in-repo `functions/.env` + `supabase/.env` from `$SECRETS_PATH/supabase/.env.local` | Replace custom secrets from `$SECRETS_PATH/supabase/.env.development` / `.test` / `.production` (drop confirm if stale) |
| `bun run db:push:config [env]`     | No-op (uses `config.toml` via `supabase start`)                                                 | `config push --remote=<ref>` (prints diff; interactive confirm — no `--yes`)                                            |
| `bun run db:push:functions [env]`  | No-op (serves from tree)                                                                        | `functions deploy --remote=<ref> --yes`                                                                                 |
| `bun run db:push:all [env]`        | Fail-fast: migrations → secrets → config → functions                                            | Same order (no reset)                                                                                                   |
| `bun run db:types [env]`           | `gen types` via localhost DB URL                                                                | `gen types --remote=<ref>`                                                                                              |

```bash
bun run db:push:secrets                 # local SoT → derived files
bun run db:push:all development         # mcp-dev
bun run db:reset                        # local Docker
bun run db:types                        # after local reset / schema change
bun run db:types development            # types from mcp-dev
```

## Supabase CLI (raw)

```bash
# Local Docker (after supabase start)
supabase db reset
bun run db:types

# Prefer bun run db:* above. Raw remotes need an explicit target, e.g.:
supabase db push --remote=zdvscmogkfyddnnxzkdu --yes
supabase config push --remote=zdvscmogkfyddnnxzkdu
supabase secrets list --remote=zdvscmogkfyddnnxzkdu
supabase gen types typescript --remote=zdvscmogkfyddnnxzkdu --schema public
```

> 💡 **Workflow**: Default UI / Lovable is **mcp-dev** (`bun dev`). Local Docker is `bun run dev:local`. **CI on a PR** uses **mcp-test** via `--remote=$SUPABASE_PROJECT_REF`. For `bun test tests/rls`: put credentials in `$SECRETS_PATH/.env.test.local` (or the shell). See [secrets.md](./secrets.md) and [architecture.md](./architecture.md). Requires **Supabase CLI v3+**.

---

## User Management

```bash
# Create a new user (or update an existing one)
# Local Docker (NODE_ENV unset): $SECRETS_PATH/.env.local
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
