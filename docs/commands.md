# Handige Commands

## Development Omgevingen

Er zijn 3 omgevingen geconfigureerd:

| Command | Omgeving | Env bestand | Gebruik |
|---------|----------|-------------|---------|
| `bun dev` | Remote development | `.env.development` | Lovable branch, remote dev server |
| `bun dev:test` | Test database | `.env.test` | Test database voor development |
| `bun prod` | Productie | `.env.production` | Productie server |

### Env bestanden aanmaken

**`.env.development`** (remote dev):
```env
VITE_SUPABASE_URL=https://xyz-dev.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Dev login bypass (optioneel, zie "Dev Login Bypass" sectie)
VITE_DEV_LOGIN_PASSWORD=your-dev-password
```

**`.env.test`** (test database):
```env
VITE_SUPABASE_URL=https://jserlqacarlgtdzrblic.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJ...
VITE_DEV_LOGIN_PASSWORD=your-test-password
```

**`.env.production`** (productie):
```env
VITE_SUPABASE_URL=https://xyz-prod.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

> 💡 Alleen `.env` staat in `.gitignore`. De `.env.test`, `.env.development` en `.env.production` bestanden worden wel gecommit (zonder secrets).

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
# Link aan remote dev project (mcp-dev)
supabase link --project-ref zdvscmogkfyddnnxzkdu

# Of gebruik --linked flag voor gelinkte project
supabase <command> --linked

# Push migraties naar remote dev
supabase db push --linked

# Push config naar remote dev
supabase config push 

# Generate types voor gelinkte project
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

> 💡 **Workflow**: Er zijn geen lokale Supabase-databases. **Development** (Lovable, `bun dev`, `db:reset`) gebruikt **mcp-dev** (`zdvscmogkfyddnnxzkdu`). **CI bij een PR** gebruikt altijd **mcp-test** (link via secret `SUPABASE_PROJECT_REF`, credentials uit secrets). Lokaal testen (`bun test rls`): zet in `.env.test` de credentials van mcp-test of mcp-dev. Zie [secrets.md](./secrets.md) en [architecture.md](./architecture.md).

---

## User Management

```bash
# Maak nieuwe gebruiker aan (of update bestaande)
# Configureer in .env.development of .env.test:
#   SUPABASE_URL=https://...supabase.co          (verplicht, API URL)
#   SUPABASE_SERVICE_ROLE_KEY=eyJ...             (verplicht, service role key)
#   DEV_LOGIN_EMAIL=user@example.com             (verplicht, voor create-user script)
#   DEV_LOGIN_PASSWORD=wachtwoord                (optioneel, zonder = passwordless user)
#   DEV_LOGIN_FIRST_NAME=Voornaam                (optioneel)
#   DEV_LOGIN_LAST_NAME=Achternaam               (optioneel)
bun run create-user
```

**Twee modes:**
- **Met wachtwoord**: User kan inloggen via Dev Login knop én Magic Link/OTP
- **Zonder wachtwoord**: User kan alleen inloggen via Magic Link/OTP

> 💡 Bij een bestaande user worden wachtwoord en naam geüpdatet (zowel in `auth.users` als `profiles` tabel).

---

## Dev Login Bypass

In development omgevingen (`test` en `development`) verschijnt een "Dev Login" knop op de login pagina. Hiermee kun je direct inloggen zonder Magic Link/OTP te hoeven afwachten.

### Rol Selectie

De Dev Login knop heeft een dropdown waarmee je kunt kiezen uit verschillende rollen:
- **Site Admin** (`site-admin@test.nl`) - Standaard geselecteerd
- **Admin** (`admin-one@test.nl`)
- **Teacher** (`teacher-alice@test.nl`)
- **Staff** (`staff-one@test.nl`)
- **Student** (`student-001@test.nl`)
- **User (geen rol)** (`user-001@test.nl`)

Deze users komen uit de test seed (`supabase/seeds/test.sql`) en zijn beschikbaar in de remote dev instance (mcp-dev) na `bun run db:reset`.

### Configuratie

**Optioneel** - Voeg toe aan `.env.development` of `.env.test` als je een custom wachtwoord wilt gebruiken:

```env
VITE_DEV_LOGIN_PASSWORD=your-custom-password
```

Als `VITE_DEV_LOGIN_PASSWORD` niet is ingesteld, wordt de Dev Login knop uitgeschakeld. De test-seed users in `supabase/seeds/test.sql` gebruiken standaard het wachtwoord `password`.

> 💡 **Let op**: De Dev Login knop gebruikt hardcoded e-mails uit `supabase/seeds/test.sql` (bijv. `site-admin@test.nl`). Deze e-mails zijn niet configureerbaar via environment variabelen. Voor custom users gebruik je `bun run create-user` met `DEV_LOGIN_EMAIL`.

### Beveiliging

- De Dev Login knop wordt **volledig verwijderd** uit production builds (Vite dead-code elimination)
- Werkt alleen in development modes (`test` en `development`)
- Extra runtime check als fallback

---

## Testing

```bash
# Unit tests (geen Supabase nodig)
bun test code

# Agenda-logica (recurrence, frequency, deviations; geen Supabase nodig)
bun test agenda

# RLS tests (tegen mcp-test of mcp-dev; vereist SUPABASE_* en VITE_DEV_LOGIN_PASSWORD in env)
bun test rls

# Auth tests (tegen mcp-test of mcp-dev; vereist SUPABASE_* en VITE_DEV_LOGIN_PASSWORD in env)
bun test auth

# Alle tests
bun test
```

---

## Linting

```bash
# TypeScript/JS (Biome)
bun run check                 # Check (geen writes)
bun run fix                   # Fix (format + lint autofix)

# Quality gates (CI)
bun run check:ci              # Biome CI + tsc + code tests
bun run check:fallow          # Fallow (dead code, duplication, complexity)

# SQL migraties (Squawk)
bun run lint:sql

# PL/pgSQL functies (tegen database; warnings én errors falen)
bun run lint:db
```

> 📖 Zie [cicd-workflows.md](./cicd-workflows.md#linting) voor uitgebreide documentatie over alle linters.
