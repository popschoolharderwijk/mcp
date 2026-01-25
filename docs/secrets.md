# Secrets Configuratie

## GitHub Secrets

Nodig voor CI workflows. Toe te voegen via:
**GitHub** → Settings → Secrets and variables → Actions → New repository secret

| Secret | Waarde | Gebruik |
|--------|--------|---------|
| `SUPABASE_ACCESS_TOKEN` | Personal access token van Supabase | CLI authenticatie |
| `SUPABASE_PROJECT_ID` | `bnagepkxryauifzyoxgo` | Production project ref |

### SUPABASE_ACCESS_TOKEN verkrijgen

1. Ga naar https://supabase.com/dashboard/account/tokens
2. Klik "Generate new token"
3. Geef naam (bv `github-ci`) en kopieer token
4. Voeg toe als GitHub secret

---

## Supabase Edge Function Secrets

Voor Edge Functions. Toe te voegen via:
**Supabase Dashboard** → Project Settings → Edge Functions → Secrets

| Secret | Beschrijving |
|--------|--------------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (⚠️ NOOIT `VITE_` prefix!) |
