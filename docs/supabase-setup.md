# Supabase Server Setup

Stappenplan om een lege Supabase server werkend te krijgen met deze applicatie.

---

## Stap 1: Nieuw Supabase Project

1. Ga naar [supabase.com/dashboard](https://supabase.com/dashboard)
2. Klik "New Project"
3. Kies organisatie en vul in:
   - **Name**: `mcp-dev` of `mcp-prod`
   - **Database Password**: Genereer en bewaar veilig
   - **Region**: `West EU (Frankfurt)` (dichtbij)
4. Wacht tot project is aangemaakt
5. Noteer de **Project ID** (uit de URL of Project Settings)

---

## Stap 2: Migraties Toepassen

```bash
# Link aan het nieuwe project
supabase link --project-ref <project-id>

# Push alle migraties
supabase db push
```

Migraties staan in `supabase/migrations/` als domain-bestanden (bijv. `_lesson_groups`, `_projects`, `_sepa_incasso`). Storage buckets (`avatars`, `announcement-images`, `sepa-batches`, invoices, …) worden in die migraties via `INSERT INTO storage.buckets` aangemaakt. Iteratieve GRANT/DROP-patches zijn samengevoegd in die domain-migraties. Na schema-wijzigingen: `bun run db:reset`.

---

## Stap 3: Authentication Configureren

### Providers inschakelen

**Dashboard** → **Authentication** → **Providers**

- ✅ Email (moet aan staan)
- Andere providers naar wens

### Auth Settings via config.toml

Alle authentication settings worden beheerd via `supabase/config.toml` en gepusht naar remote projects. **Geen handmatige Dashboard configuratie nodig!**

#### Remote Project Settings

De `[remotes.test.auth]`, `[remotes.dev.auth]` en `[remotes.prod.auth]` secties overschrijven de defaults voor remote projects. mcp-dev en mcp-test delen Lovable-URLs, `localhost:5173` en het `[DEV]`-mailonderwerp. Productie (`[remotes.prod.auth]`) heeft `mcp.mplifi.nl`, geen publieke signup, strakkere rate limits en subject `Je inloglink`.

#### Settings Pushen naar Remote

Na het configureren van `config.toml`, push de settings naar je remote project:

```bash
# Link aan het project (als nog niet gedaan)
supabase link --project-ref <project-id>

# Push configuratie naar remote
supabase config push

# Review de changes die gepusht worden
# Type 'Y' om te bevestigen
```

> ⚠️ **Waarom zo complexe password requirements?**
> 
> Deze applicatie gebruikt uitsluitend **OTP/Magic Link** voor authenticatie. De frontend biedt **geen mogelijkheid** om een wachtwoord in te stellen of te gebruiken.
> 
> Echter, Supabase ondersteunt aan de achterkant technisch gezien wel password-based authenticatie via de API. Om misbruik via directe API calls te voorkomen, stellen we de password requirements zo hoog mogelijk in. Een wachtwoord van 32+ karakters met letters, cijfers én symbolen is praktisch onmogelijk te raden of bruteforcen.

> 💡 **Verificatie via tests**
> 
> De password policy wordt geverifieerd door `tests/auth/password-signup.test.ts`. Deze test controleert dat:
> - Wachtwoorden korter dan 32 karakters worden geweigerd
> - Wachtwoorden zonder symbolen, cijfers, of letters worden geweigerd
> - Alleen wachtwoorden die aan alle eisen voldoen worden geaccepteerd

> 📝 **Belangrijk**: Wijzigingen in `config.toml` worden **niet automatisch** naar remote gepusht. Gebruik altijd `supabase config push` na wijzigingen en review de diff zorgvuldig voordat je bevestigt.

---

## Stap 4: Email Templates & SMTP

Zie [email-templates.md](email-templates.md) voor:
- Magic Link template instellen
- SMTP configuratie via `config.toml` (Resend)

---

## Stap 5: API Keys Ophalen

**Dashboard** → **Project Settings** → **API**

Noteer:
- **Project URL**: `https://<project-id>.supabase.co`
- **Anon/Public Key**: Voor frontend (`VITE_SUPABASE_ANON_KEY`)
- **Service Role Key**: Voor backend/tests (⚠️ geheim houden!)

---

## Stap 6: Environment Files Aanmaken

### Voor development (.env.development)

```bash
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### Voor test database (.env.test)

```bash
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<anon-key>
VITE_DEV_LOGIN_PASSWORD=<test-password>
```

### Voor scripts en tests (.env)

```bash
SUPABASE_URL=https://<project-id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
RESEND_API_KEY=<resend-api-key>
```

> 📝 **Belangrijk**: De `RESEND_API_KEY` is nodig voor SMTP email delivery. Deze wordt gebruikt door de SMTP configuratie in `config.toml`.

---

## Stap 7: Secrets Configureren

Zie [secrets.md](secrets.md) voor:
- GitHub Secrets (voor CI/CD)
- Edge Function Secrets

---

## Stap 8: Config.toml Bijwerken

Update `supabase/config.toml` met de nieuwe project ID en auth settings:

```toml
[remotes.nieuw]
project_id = "<nieuwe-project-id>"

[remotes.nieuw.db.seed]
enabled = true  # false voor production
sql_paths = ["./seeds/bootstrap.sql", "./seeds/test.sql"]  # prod: alleen bootstrap.sql

[remotes.nieuw.auth]
site_url = "https://jouw-domein.nl"
additional_redirect_urls = ["https://jouw-domein.nl/**"]
minimum_password_length = 32
password_requirements = "lower_upper_letters_digits_symbols"
```

**Push de configuratie naar remote:**

```bash
supabase link --project-ref <nieuwe-project-id>
supabase config push
# Review de diff en type 'Y' om te bevestigen
```

---

## Checklist

- [ ] Project aangemaakt
- [ ] Migraties toegepast (`supabase db push` / `db reset`) — storage buckets via migraties
- [ ] Email provider ingeschakeld (Dashboard)
- [ ] `config.toml` bijgewerkt met project ID
- [ ] Auth settings geconfigureerd in `config.toml`:
  - [ ] `minimum_password_length = 32`
  - [ ] `password_requirements = "lower_upper_letters_digits_symbols"`
  - [ ] `otp_length = 8`
  - [ ] `site_url` en `additional_redirect_urls` correct
- [ ] Config gepusht naar remote (`supabase config push`)
- [ ] Password policy tests draaien (`bun test tests/auth/password-signup.test.ts`)
- [ ] Email templates ingesteld
- [ ] SMTP geconfigureerd in `config.toml` (Resend)
- [ ] `RESEND_API_KEY` toegevoegd aan `.env`
- [ ] Config gepusht naar remote (`supabase config push`)
- [ ] API keys opgehaald
- [ ] Environment files aangemaakt (`.env`)
