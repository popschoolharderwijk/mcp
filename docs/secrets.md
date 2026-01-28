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

## Local Supabase Credentials (Safe to Commit)

The following credentials are used in CI for local Supabase testing. These are **standard demo keys** shipped with every Supabase installation and are publicly documented. They only work for local development.

| Variable | Value | Notes |
|----------|-------|-------|
| `SUPABASE_URL` | `http://localhost:54321` | Local API endpoint |
| `SUPABASE_PUBLISHABLE_DEFAULT_KEY` | `eyJhbGci...` (anon) | Standard local anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` (service) | Standard local service key |

These keys are hardcoded in `.github/workflows/pull-request-supabase.yml` and are safe to commit because:
- They are the same for all local Supabase installations worldwide
- They only work against `localhost:54321`
- They are publicly documented in Supabase's official docs

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
