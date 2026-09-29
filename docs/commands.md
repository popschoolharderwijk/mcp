# Useful Commands

## Development Environments

Three environments are configured:

| Command | Environment | Env file | Use |
|---------|-------------|----------|-----|
| `bun dev` | Remote development | `.env.development` | Lovable branch, remote dev server |
| `bun dev:test` | Test database | `.env.test` | Test database for development |
| `bun prod` | Production | `.env.production` | Production server |

### Creating env files

**`.env.development`** (remote dev):
```env
VITE_SUPABASE_URL=https://xyz-dev.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Dev login bypass (optional, see "Dev Login Bypass")
VITE_DEV_LOGIN_PASSWORD=your-dev-password
```

**`.env.test`** (test database):
```env
VITE_SUPABASE_URL=https://jserlqacarlgtdzrblic.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJ...
VITE_DEV_LOGIN_PASSWORD=your-test-password
```

**`.env.production`** (production):
```env
VITE_SUPABASE_URL=https://xyz-prod.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

> 💡 Only `.env` is in `.gitignore`. The `.env.test`, `.env.development`, and `.env.production` files are committed (without secrets).

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
# Link to the remote dev project (mcp-dev)
supabase link --project-ref zdvscmogkfyddnnxzkdu

# Or use --linked for the currently linked project
supabase <command> --linked

# Push migrations to remote dev
supabase db push --linked

# Push config to remote dev
supabase config push

# Generate types for the linked project
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

> 💡 **Workflow**: There are no local Supabase databases. **Development** (Lovable, `bun dev`, `db:reset`) uses **mcp-dev** (`zdvscmogkfyddnnxzkdu`). **CI on a PR** always uses **mcp-test** (link via secret `SUPABASE_PROJECT_REF`, credentials from secrets). Local testing (`bun test tests/rls`): put mcp-test or mcp-dev credentials in `.env.test`. See [secrets.md](./secrets.md) and [architecture.md](./architecture.md).

---

## User Management

```bash
# Create a new user (or update an existing one)
# Configure in .env.development or .env.test:
#   SUPABASE_URL=https://...supabase.co          (required, API URL)
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

In development environments (`test` and `development`) a "Dev Login" button appears on the login page. Use it to sign in immediately without waiting for Magic Link/OTP.

### Role selection

The Dev Login button has a dropdown to choose a role:
- **Site Admin** (`site-admin@test.nl`) - Selected by default
- **Admin** (`admin-one@test.nl`)
- **Teacher** (`teacher-alice@test.nl`)
- **Staff** (`staff-one@test.nl`)
- **Student** (`student-001@test.nl`)
- **User (no role)** (`user-001@test.nl`)

These users come from the test seed (`supabase/seeds/test.sql`) and are available on the remote dev instance (mcp-dev) after `bun run db:reset`.

### Configuration

**Optional** — add to `.env.development` or `.env.test` if you want a custom password:

```env
VITE_DEV_LOGIN_PASSWORD=your-custom-password
```

If `VITE_DEV_LOGIN_PASSWORD` is not set, the Dev Login button is disabled. Test-seed users in `supabase/seeds/test.sql` use the password `password` by default.

> 💡 **Note**: The Dev Login button uses hardcoded emails from `supabase/seeds/test.sql` (e.g. `site-admin@test.nl`). Those emails are not configurable via environment variables. For custom users use `bun run create-user` with `DEV_LOGIN_EMAIL`.

### Security

- The Dev Login button is **fully removed** from production builds (Vite dead-code elimination)
- Works only in development modes (`test` and `development`)
- Extra runtime check as a fallback

---

## Testing

```bash
# Unit tests (no Supabase needed)
bun test tests/code

# Agenda logic (recurrence, frequency, deviations; no Supabase needed)
bun test agenda

# RLS / auth / e2e (against mcp-test or mcp-dev; requires SUPABASE_* and VITE_DEV_LOGIN_PASSWORD in env)
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

# PL/pgSQL functions (against the database; warnings and errors fail)
bun run lint:db
```

> 📖 See [cicd-workflows.md](./cicd-workflows.md#linting) for full documentation of all linters.
