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

# Dev login bypass (optioneel, zie "Dev Login Bypass" sectie)
VITE_DEV_LOGIN_EMAIL=dev@example.com
VITE_DEV_LOGIN_PASSWORD=your-dev-password
```

**`.env.localdev`** (lokale Supabase):
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJ...lokale-anon-key

# Voor scripts (createuser, create-storage-bucket)
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=eyJ...lokale-service-key

# Dev login bypass (optioneel, zie "Dev Login Bypass" sectie)
VITE_DEV_LOGIN_EMAIL=dev@example.com
VITE_DEV_LOGIN_PASSWORD=your-dev-password
```

**`.env.production`** (productie):
```env
VITE_SUPABASE_URL=https://xyz-prod.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

> 💡 Alleen `.env` staat in `.gitignore`. De `.env.localdev`, `.env.development` en `.env.production` bestanden worden wel gecommit (zonder secrets).

### Lokale Supabase credentials ophalen

Na `supabase start` verschijnen de credentials in de terminal. Je kunt ze ook opvragen met:

```bash
supabase status
```

| Waarde | URL | Gebruik |
|--------|-----|---------|
| `API URL` | `http://localhost:54321` | → `VITE_SUPABASE_URL` én `SUPABASE_URL` |
| `Studio URL` | `http://localhost:54323` | Supabase Dashboard (database, auth, etc.) |
| `anon key` | | → `VITE_SUPABASE_ANON_KEY` |
| `service_role key` | | → `SUPABASE_SERVICE_ROLE_KEY` (voor scripts) |

> ⚠️ **Let op**: De API draait op poort **54321**, het Dashboard op poort **54323**. Dit zijn verschillende poorten!

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
# Maak nieuwe gebruiker aan (of update bestaande)
# Configureer in .env.localdev of .env.development:
#   SUPABASE_URL=http://localhost:54321          (verplicht, API URL)
#   SUPABASE_SERVICE_ROLE_KEY=eyJ...             (verplicht, service role key)
#   VITE_DEV_LOGIN_EMAIL=user@example.com        (verplicht)
#   VITE_DEV_LOGIN_PASSWORD=wachtwoord           (optioneel, zonder = passwordless user)
#   DEV_LOGIN_FIRST_NAME=Voornaam                (optioneel)
#   DEV_LOGIN_LAST_NAME=Achternaam               (optioneel)
bun run createuser
```

**Twee modes:**
- **Met wachtwoord**: User kan inloggen via Dev Login knop én Magic Link/OTP
- **Zonder wachtwoord**: User kan alleen inloggen via Magic Link/OTP

> 💡 Bij een bestaande user worden wachtwoord en naam geüpdatet (zowel in `auth.users` als `profiles` tabel).

---

## Dev Login Bypass

In development omgevingen (`localdev` en `development`) verschijnt een "Dev Login" knop op de login pagina. Hiermee kun je direct inloggen zonder Magic Link/OTP te hoeven afwachten.

### Configuratie

Voeg toe aan `.env.localdev` en/of `.env.development`:

```env
VITE_DEV_LOGIN_EMAIL=dev@example.com
VITE_DEV_LOGIN_PASSWORD=your-dev-password
```

### Gebruiker aanmaken

```bash
# Maak user aan met wachtwoord
bun run createuser
```

> ⚠️ De user moet bestaan in Supabase Auth én een wachtwoord hebben. Zonder `VITE_DEV_LOGIN_PASSWORD` wordt de knop disabled getoond.

### Beveiliging

- De Dev Login knop wordt **volledig verwijderd** uit production builds (Vite dead-code elimination)
- Zonder de `VITE_DEV_LOGIN_*` env variabelen verschijnt de knop niet
- Extra runtime check als fallback

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
