# Secrets Configuration

## GitHub Secrets

Required for CI workflows. Add via:
**GitHub** → Settings → Secrets and variables → Actions → New repository secret

| Secret | Value | Used by |
|--------|-------|---------|
| `SUPABASE_ACCESS_TOKEN` | Personal access token from Supabase | CLI authentication |
| `SUPABASE_PROJECT_ID` | `bnagepkxryauifzyoxgo` | Production project ref |
| `RESEND_API_KEY` | API key from Resend.com | Email sending in tests |

### SUPABASE_ACCESS_TOKEN

1. Go to https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Name it (e.g. `github-ci`) and copy the token
4. Add as GitHub secret

### RESEND_API_KEY

1. Go to https://resend.com/api-keys
2. Create a new API key
3. Add as GitHub secret

---

## Local Supabase Credentials (CI)

For local Supabase testing in CI, credentials are **dynamically fetched** from the running instance using `supabase status -o json`. This ensures the JWT keys always match the local instance's secret.

| Variable | Source | Notes |
|----------|--------|-------|
| `SUPABASE_URL` | `supabase status` → `API_URL` | Local API endpoint |
| `SUPABASE_PUBLISHABLE_DEFAULT_KEY` | `supabase status` → `ANON_KEY` | Anon key from running instance |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabase status` → `SERVICE_ROLE_KEY` | Service key from running instance |

See `.github/workflows/pull-request-supabase.yml` for implementation.

⚠️ **Never commit production keys!** Production credentials should always be stored in GitHub Secrets or Supabase Dashboard.

---

## Supabase Edge Function Secrets

For Edge Functions. Add via:
**Supabase Dashboard** → Project Settings → Edge Functions → Secrets

| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (⚠️ NEVER use `VITE_` prefix!) |
