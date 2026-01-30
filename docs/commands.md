# Handige Commands

## Development Omgevingen

Er zijn 3 omgevingen geconfigureerd:

| Command | Omgeving | Env bestand | Gebruik |
|---------|----------|-------------|---------|
| `bun dev` | Remote development | `.env.development` | Lovable branch, remote dev server |
| `bun dev:local` | Lokale Supabase | `.env.localdev` | Lokaal testen met `supabase start` |
| `bun prod` | Productie | `.env.production` | Productie server |

### Env bestanden aanmaken

**`.env.development`** (remote dev):
```env
VITE_SUPABASE_URL=https://xyz-dev.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**`.env.localdev`** (lokale Supabase - niet in git):
```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJ...lokale-anon-key
```

**`.env.production`** (productie):
```env
VITE_SUPABASE_URL=https://xyz-prod.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

> 💡 `.env.localdev` staat in `.gitignore` en moet lokaal worden aangemaakt. De anon key vind je in de output van `supabase start`.

---

## Git Branch Management

```bash
# Reset lovable branch naar main (verliest Lovable history awareness!)
git checkout -B lovable origin/main
git push -u origin lovable --force

# Complete history reset (orphan branch) - DESTRUCTIEF
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
# Link project
supabase link --project-ref <project-id>

# Start lokale Supabase
supabase start

# Start lokale Supabase (minimaal voor tests)
supabase start -x realtime,storage-api,imgproxy,edge-runtime,logflare,vector,studio,postgres-meta,supavisor

# Stop lokale Supabase
supabase stop

# Push migraties naar remote
supabase db push

# Push config naar remote
supabase config push

# Generate types
supabase gen types typescript --project-id <project-id> > src/integrations/supabase/types.ts
```

---

## Storage Buckets

```bash
# Maak avatars storage bucket aan (vereist .env met SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY)
bun run create-storage-bucket
```

> ⚠️ Storage buckets kunnen niet via SQL migraties worden aangemaakt. Run dit script **voor** je de storage RLS migratie toepast.

---

## User Management

```bash
# Maak nieuwe gebruiker aan (passwordless, alleen OTP/Magic Link)
# Configureer in .env:
#   CREATE_USER_EMAIL=user@example.com
#   CREATE_USER_FIRST_NAME=Voornaam
#   CREATE_USER_LAST_NAME=Achternaam
bun run createuser
```

---

## Testing

```bash
# Unit tests (geen Supabase nodig)
bun test code

# RLS tests (lokale Supabase moet draaien)
bun test rls

# Auth tests (lokale Supabase moet draaien)
bun test auth

# Alle tests
bun test
```

---

## Biome Linting

```bash
# Check
biome ci

# Format
biome format --write .

# Lint + fix
biome check --write .
```
