# Useful Commands

## Development Environments

| Command | Environment | Env file | Use |
|---------|-------------|----------|-----|
| `bun dev` | Remote development | `.env.development` | Shared mcp-dev / Lovable (default `dev` script) |
| `bun run dev:local` | Local | `.env.local` | Docker Supabase (`supabase start`); Vite port **8081** (beside `bun dev` on 8080) |
| `bun run dev:test` | Test database | `.env.test` | Remote mcp-test |
| `bun prod` | Production | `.env.production` | Production server |

Vite forbids **mode name** `local` (it would clash with the `.env.local` postfix). The script therefore uses mode **`localdev`**. The env file can still be normal **`.env.local`** (always loaded; gitignored). For `bun dev`, `.env.development` overrides the same keys so mcp-dev wins.

### Creating env files

**`.env.development`** (remote mcp-dev — Lovable + `bun dev`):
```env
VITE_SUPABASE_URL=https://xyz-dev.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJ...

# Dev login bypass (optional, see "Dev Login Bypass")
VITE_DEV_LOGIN_PASSWORD=your-dev-password
```

**`.env.local`** (local Docker — gitignored; used by `bun run dev:local`):
```env
VITE_SUPABASE_URL=http://127.0.0.1:54421
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key from supabase status>
VITE_DEV_LOGIN_PASSWORD=password
```

(`supabase status` prints `VITE_SUPABASE_PUBLISHABLE_KEY`. Remote `.env.development` / `.env.test` may still use `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` — the client accepts either.)

This project uses **non-default** local ports (offset +100: API `54421`, DB `54422`, Studio `54423`, Mailpit `54424`, analytics `54427`/`54428`, pooler `54429`) so it can run beside other `supabase start` stacks. Copy keys from `supabase status` after `supabase start`. Set `RESEND_API_KEY` in the shell or root `.env` so `config.toml` SMTP substitution works.

**`.env.test`** (remote mcp-test — `bun run dev:test`):
```env
VITE_SUPABASE_URL=https://jserlqacarlgtdzrblic.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJ...
VITE_DEV_LOGIN_PASSWORD=your-test-password
```

**`.env.production`** (production):
```env
VITE_SUPABASE_URL=https://xyz-prod.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJ...
```

> 💡 `.env` and `*.local` are gitignored. Committed mode files (`.env.development`, `.env.test`, `.env.production`) hold non-secret URLs/keys for remote projects.

### Local Docker day-to-day

```bash
supabase start
# fill .env.local from supabase status
export RESEND_API_KEY=...   # if not already in .env
supabase db reset
bun run dev:local
```

Types from the local stack:

```bash
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

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

## Supabase CLI

```bash
# Local Docker (after supabase start)
supabase db reset
supabase gen types typescript --local > src/integrations/supabase/types.ts

# Link to the remote dev project (mcp-dev)
supabase link --project-ref zdvscmogkfyddnnxzkdu

# Or use --linked for the currently linked project
supabase <command> --linked

# Push migrations to remote
supabase db push --linked

# Push config to remote
supabase config push

# Generate types for the linked project
bun run supabase:types
# or: supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

> 💡 **Workflow**: Default UI / Lovable is **mcp-dev** (`bun dev`). Local Docker is `bun run dev:local`. **CI on a PR** uses **mcp-test** (link via secret `SUPABASE_PROJECT_REF`). For `bun test tests/rls`: put mcp-test or mcp-dev credentials in `.env.test` or the shell. See [secrets.md](./secrets.md) and [architecture.md](./architecture.md).

---

## User Management

```bash
# Create a new user (or update an existing one)
# Configure in .env.local / .env.development / shell:
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

**Optional** — add to `.env.local` or `.env.development` if you want a custom password:

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
# Unit tests (no Supabase needed)
bun test tests/code

# Agenda logic (recurrence, frequency, deviations; no Supabase needed)
bun test agenda

# RLS / auth / e2e (against mcp-test, mcp-dev, or local; requires SUPABASE_* and VITE_DEV_LOGIN_PASSWORD in env)
# Use path prefixes — bare `auth` also matches tests/code/auth/
bun test tests/rls
bun test tests/auth
bun test tests/e2e

# All tests
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

# SQL migrations (Squawk)
bun run lint:sql

# PL/pgSQL functions (against the linked remote database; warnings and errors fail)
bun run lint:db
```

> 📖 See [cicd-workflows.md](./cicd-workflows.md#linting) for full documentation of all linters.
