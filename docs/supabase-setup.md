# Supabase Server Setup

How to get an empty Supabase project working with this application.

---

## Step 1: New Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose an organisation and fill in:
   - **Name**: `mcp-dev` or `mcp-prod`
   - **Database Password**: Generate and store securely
   - **Region**: `West EU (Frankfurt)` (closest)
4. Wait until the project is created
5. Note the **Project ID** (from the URL or Project Settings)

---

## Step 2: Apply Migrations

```bash
# Push all migrations (CLI v3: explicit remote)
supabase db push --remote=<project-ref> --yes
# or: bun run db:push:migrations <development|test|production>
```

Migrations live in `supabase/migrations/` as domain files (e.g. `_lesson_groups`, `_projects`, `_stripe_billing`). Storage buckets (`avatars`, `announcement-images`, …) are created in those migrations via `INSERT INTO storage.buckets`. Iterative GRANT/DROP patches are folded into those domain migrations. After schema changes: reset the DB (`supabase db reset` locally, or `bun run db:reset <env>` / `supabase db reset --remote=<ref> --yes` on remote) and regenerate types (`bun run db:types` / `bun run db:types <env>`).

---

## Step 3: Configure Authentication

### Enable providers

**Dashboard** → **Authentication** → **Providers**

- ✅ Email (must be on)
- Other providers as needed

### Auth settings via config.toml

All authentication settings are managed in `supabase/config.toml` and pushed to remote projects. **No manual Dashboard configuration is required.**

#### Remote project settings

Root `[auth]` is the base config (local Docker: Vite `:8080` / `:8081`). On `config push` / branching, each `[remotes.*]` block is **deep-merged** over that base: nested tables merge, but **arrays and scalars replace wholesale** (they do not append). So `[remotes.*.auth].additional_redirect_urls` must list every allowed URL for that project — omitting it would push the local localhost list to the remote. mcp-dev and mcp-test set full Lovable redirect lists; production (`[remotes.prod.auth]`) uses `mcp.mplifi.nl`, no public signup, tighter rate limits, and subject `Je inloglink`. Unspecified auth fields (e.g. email templates subject `[DEV]`) still come from root.

#### Push settings to remote

After configuring `config.toml`, push settings to the remote project:

```bash
# Review then push (CLI v3)
supabase config diff --remote=<project-ref>
supabase config push --remote=<project-ref>
# or: bun run db:push:config <development|test|production>
```

> ⚠️ **Why are password requirements so strict?**
>
> This application uses **OTP/Magic Link** only for authentication. The frontend provides **no way** to set or use a password.
>
> Supabase still technically supports password-based authentication via the API. To prevent abuse via direct API calls, password requirements are set as high as possible. A password of 32+ characters with letters, digits, and symbols is practically impossible to guess or brute-force.

> 💡 **Verification via tests**
>
> The password policy is verified by `tests/auth/password-signup.test.ts`. That test checks that:
> - Passwords shorter than 32 characters are rejected
> - Passwords without symbols, digits, or letters are rejected
> - Only passwords that meet all requirements are accepted

> 📝 **Important**: Changes in `config.toml` are **not** pushed to remote automatically. Use `bun run db:push:config <env>` (or `config push --remote=<ref>`) after changes — the CLI shows the diff and asks before writing. Hosted settings that this file should own must appear as keys in `config.toml` — `config push` only updates those.

---

## Step 4: Email Templates & SMTP

See [email-templates.md](email-templates.md) for:

- Setting the Magic Link template
- SMTP configuration via `config.toml` (Resend)

---

## Step 5: Fetch API Keys

**Dashboard** → **Project Settings** → **API**

Note:

- **Project URL**: `https://<project-id>.supabase.co`
- **Anon/Public Key**: For the frontend (`VITE_SUPABASE_ANON_KEY`)
- **Service Role Key**: For backend/tests (⚠️ keep secret!)

---

## Step 6: Create Environment Files

### For development (.env.development)

```bash
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### For the test database (.env.test)

```bash
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<anon-key>
VITE_DEV_LOGIN_PASSWORD=<test-password>
```

### For scripts and tests (.env)

```bash
SUPABASE_URL=https://<project-id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
RESEND_API_KEY=<resend-api-key>
```

> 📝 **Important**: `RESEND_API_KEY` is required for SMTP email delivery. It is used by the SMTP configuration in `config.toml`.

---

## Step 7: Configure Secrets

See [secrets.md](secrets.md) for:

- GitHub Secrets (for CI/CD)
- Edge Function Secrets

---

## Step 8: Update config.toml

Update `supabase/config.toml` with the new project ID and auth settings:

```toml
[remotes.new]
project_id = "<new-project-id>"

[remotes.new.db.seed]
enabled = true  # false for production
sql_paths = ["./seeds/bootstrap.sql", "./seeds/lesson-types.sql", "./seeds/test.sql"]  # prod: bootstrap.sql only
```

```toml
[remotes.new.auth]
site_url = "https://your-domain.example"
additional_redirect_urls = ["https://your-domain.example/**"]
minimum_password_length = 32
password_requirements = "lower_upper_letters_digits_symbols"
```

**Push the configuration to remote:**

```bash
supabase config diff --remote=<new-project-ref>
supabase config push --remote=<new-project-ref>
```

---

## Checklist

- [ ] Project created
- [ ] Migrations applied (`bun run db:push:migrations <env>` / `db reset`) — storage buckets via migrations
- [ ] Email provider enabled (Dashboard)
- [ ] `config.toml` updated with project ID
- [ ] Auth settings configured in `config.toml`:
  - [ ] `minimum_password_length = 32`
  - [ ] `password_requirements = "lower_upper_letters_digits_symbols"`
  - [ ] `otp_length = 8`
  - [ ] `site_url` and `additional_redirect_urls` correct
- [ ] Config pushed to remote (`bun run db:push:config <env>`)
- [ ] Password policy tests run (`bun test tests/auth/password-signup.test.ts`)
- [ ] Email templates configured
- [ ] SMTP configured in `config.toml` (Resend)
- [ ] `cp .env.example .env` + Edge/Auth SoT under `$SECRETS_PATH/supabase/` + `bun run db:push:secrets <env>`
- [ ] Config pushed to remote (`bun run db:push:config <env>`)
- [ ] API keys fetched
- [ ] Environment files created (committed Vite `.env.*` + runtime/edge files under `SECRETS_PATH`)
