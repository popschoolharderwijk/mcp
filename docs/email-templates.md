# E-mailtemplates & SMTP

De applicatie kent **twee** lagen e-mailtemplates:

1. **Supabase Auth e-mails** (Magic Link / OTP) — beheerd via `supabase/config.toml` en het Supabase Dashboard. Bestanden in `docs/email-templates/`.
2. **App-level transactionele e-mails** — opgeslagen in de database (`email_templates`) en beheerd in de app via **Settings → E-mailtemplates** (`EmailTemplatesManager`).

Beide gebruiken dezelfde SMTP-provider (Resend).

---

## 1. Supabase Auth e-mails (Magic Link)

### Waar instellen

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → project (dev/test/prod).
2. **Authentication → Email → Magic Link**.
3. Plak de inhoud van `docs/email-templates/magic-link.html` in het Body-veld.
4. Subject: `[DEV] Je inloglink voor de Mplify Community Portal` (mcp-dev / mcp-test) of `Je inloglink` (productie). Bron: `supabase/config.toml`.

> ⚠️ Doe dit voor **elke** Supabase omgeving (mcp-dev, mcp-test, production). De templates worden niet automatisch gesynchroniseerd.

### Beschikbare variabelen

| Variabele | Beschrijving |
|-----------|--------------|
| `{{ .ConfirmationURL }}` | Volledige Magic Link URL |
| `{{ .Token }}` | OTP code |
| `{{ .TokenHash }}` | Hash van de token (voor URLs) |
| `{{ .SiteURL }}` | Geconfigureerde Site URL |
| `{{ .Email }}` | E-mailadres van de gebruiker |

De Stripe-incasso flow gebruikt een eigen variant met `token_hash` formaat — zie [stripe-incasso.md §5](integrations/stripe-incasso.md).

---

## 2. App-level e-mailtemplates (database-backed)

Beheer via de UI: **Settings → E-mailtemplates** (`src/components/settings/EmailTemplatesManager.tsx`).

### Datamodel

Tabel `email_templates` (migratie `20260513085233`):

| Kolom | Doel |
|-------|------|
| `event_key` | Unieke key van het event (bv. `incasso_invite`, `signup_approved`). |
| `subject` | Onderwerpregel; ondersteunt `{{variable}}` interpolatie. |
| `body_html` | HTML body met dezelfde variabelen. |
| `is_enabled` | Of de template actief is. Disabled = geen mail verstuurd. |
| `updated_at` | Laatst gewijzigd. |

RLS: alleen `is_privileged()` (admin/staff) mag lezen/schrijven.

### Welke events bestaan

Gedefinieerd in `supabase/functions/_shared/email-events.ts`. Elke entry beschrijft:
- `eventKey` — koppeling met `email_templates.event_key`
- `label` + `description` — getoond in de manager
- `variables` — welke placeholders beschikbaar zijn

De `EmailTemplatesManager` toont elk event als een **inklapbaar item** (collapsible); de inhoud (subject, body, preview, testverzending) laadt pas bij openen om het overzicht rustig te houden.

### Verzendflow

Edge function `send-template-email` (`supabase/functions/send-template-email/index.ts`):

1. Ontvangt `{ eventKey, to, variables }` (JWT verplicht; alleen privileged of service-role).
2. Haalt template op uit `email_templates` waar `event_key = ?` én `is_enabled = true`.
3. Vult variabelen in (`{{name}}` → waarde).
4. Verstuurt via Resend met `RESEND_API_KEY`.

Andere edge functions (`send-incasso-invite`, `approve-signup-request`, `schedule-trial-lesson`, …) gebruiken intern dezelfde helper.

### Testen vanuit de UI

In de manager kun je per template een **testmail** sturen naar je eigen ingelogde adres. Voorbeeldwaardes voor placeholders worden ingevuld op basis van `email-events.ts`.

---

## 3. Custom SMTP (Resend)

We gebruiken [Resend](https://resend.com) voor zowel Supabase Auth-mails als app-mails.

### Configuratie via `supabase/config.toml`

Alle SMTP settings staan in `[auth.email.smtp]` en worden gepusht naar remote projects — **geen handmatige Dashboard-config nodig**.

> 📝 `pass = "env(RESEND_API_KEY)"` betekent dat de key uit een environment variable wordt gelezen. Zorg dat `RESEND_API_KEY` in `.env.development` staat én in GitHub Secrets én in Supabase Edge Function Secrets.

### Setup

1. Maak een account op [resend.com](https://resend.com).
2. **Settings → API Keys** → nieuwe key.
3. **Settings → Domains** → domein verifiëren (DNS records).
4. Voeg `RESEND_API_KEY=re_xxx...` toe aan `.env.development`.

### SMTP pushen

```bash
supabase link --project-ref <project-id>
supabase config push  # review diff, type Y
```

> ⚠️ De sender email (`admin_email`) moet een geverifieerd domein zijn in Resend. Voor development is `xxx@resend.dev` (test domain) toegestaan.

---

## 4. Project IDs (waar SMTP en templates instellen)

| Omgeving | Project ref |
|----------|-------------|
| Development | `zdvscmogkfyddnnxzkdu` |
| Test (CI) | `jserlqacarlgtdzrblic` |
| Production | `bnagepkxryauifzyoxgo` |
