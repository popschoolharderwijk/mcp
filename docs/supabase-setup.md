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
# Link to the new project
supabase link --project-ref <project-id>

# Push all migrations
supabase db push
```

Migrations live in `supabase/migrations/` as domain files (e.g. `_lesson_groups`, `_projects`, `_sepa_direct_debit`). Storage buckets (`avatars`, `announcement-images`, `sepa-batches`, invoices, …) are created in those migrations via `INSERT INTO storage.buckets`. Iterative GRANT/DROP patches are folded into those domain migrations. After schema changes: `bun run db:reset`.

---

## Step 3: Configure Authentication

### Enable providers

**Dashboard** → **Authentication** → **Providers**

- ✅ Email (must be on)
- Other providers as needed

### Auth settings via config.toml

All authentication settings are managed in `supabase/config.toml` and pushed to remote projects. **No manual Dashboard configuration is required.**

#### Remote project settings

The `[remotes.test.auth]`, `[remotes.dev.auth]`, and `[remotes.prod.auth]` sections override defaults for remote projects. mcp-dev and mcp-test share Lovable URLs, `localhost:5173`, and the `[DEV]` mail subject. Production (`[remotes.prod.auth]`) uses `mcp.mplifi.nl`, no public signup, tighter rate limits, and subject `Je inloglink`.

#### Push settings to remote

After configuring `config.toml`, push settings to the remote project:

```bash
# Link to the project (if not already done)
supabase link --project-ref <project-id>

# Push configuration to remote
supabase config push

# Review the changes that will be pushed
# Type 'Y' to confirm
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

> 📝 **Important**: Changes in `config.toml` are **not** pushed to remote automatically. Always use `supabase config push` after changes and review the diff carefully before confirming.

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
sql_paths = ["./seeds/bootstrap.sql", "./seeds/test.sql"]  # prod: bootstrap.sql only
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
supabase link --project-ref <new-project-id>
supabase config push
# Review the diff and type 'Y' to confirm
```

---

## Checklist

- [ ] Project created
- [ ] Migrations applied (`supabase db push` / `db reset`) — storage buckets via migrations
- [ ] Email provider enabled (Dashboard)
- [ ] `config.toml` updated with project ID
- [ ] Auth settings configured in `config.toml`:
  - [ ] `minimum_password_length = 32`
  - [ ] `password_requirements = "lower_upper_letters_digits_symbols"`
  - [ ] `otp_length = 8`
  - [ ] `site_url` and `additional_redirect_urls` correct
- [ ] Config pushed to remote (`supabase config push`)
- [ ] Password policy tests run (`bun test tests/auth/password-signup.test.ts`)
- [ ] Email templates configured
- [ ] SMTP configured in `config.toml` (Resend)
- [ ] `RESEND_API_KEY` added to `.env`
- [ ] Config pushed to remote (`supabase config push`)
- [ ] API keys fetched
- [ ] Environment files created (`.env`)
