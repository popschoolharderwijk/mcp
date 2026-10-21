# Email templates & SMTP

The application has **two** layers of email templates:

1. **Supabase Auth emails** (Magic Link / OTP) — managed via `supabase/config.toml` and the Supabase Dashboard. Files in `docs/email-templates/`.
2. **App-level transactional emails** — stored in the database (`email_templates`) and managed in the app via **Settings → E-mailtemplates** (`EmailTemplatesManager`).

Both use the same SMTP provider (Resend).

---

## 1. Supabase Auth emails (Magic Link)

### Where to configure

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → project (dev/test/prod).
2. **Authentication → Email → Magic Link**.
3. Paste the contents of `docs/email-templates/magic-link.html` into the Body field.
4. Subject: `[DEV] Je inloglink voor de Mplify Community Portal` (mcp-dev / mcp-test) or `Je inloglink` (production). Source: `supabase/config.toml`.

> ⚠️ Do this for **every** Supabase environment (mcp-dev, mcp-test, production). Templates are not synced automatically.

### Available variables

| Variable | Description |
|----------|-------------|
| `{{ .ConfirmationURL }}` | Full Magic Link URL |
| `{{ .Token }}` | OTP code |
| `{{ .TokenHash }}` | Hash of the token (for URLs) |
| `{{ .SiteURL }}` | Configured Site URL |
| `{{ .Email }}` | User email address |

The Stripe direct-debit flow uses its own variant with `token_hash` format — see [stripe-direct-debit.md §5](integrations/stripe-direct-debit.md).

---

## 2. App-level email templates (database-backed)

Manage via the UI: **Settings → E-mailtemplates** (`src/components/settings/EmailTemplatesManager.tsx`).

### Data model

Table `email_templates` (migration `20260513085233`):

| Column | Purpose |
|--------|---------|
| `event_key` | Unique event key (e.g. `direct_debit_invite`, `signup_approved`). |
| `subject` | Subject line; supports `{{variable}}` interpolation. |
| `body_html` | HTML body with the same variables. |
| `is_enabled` | Whether the template is active. Disabled = no mail sent. |
| `updated_at` | Last changed. |

RLS: only `is_privileged()` (admin/staff) may read/write.

### Which events exist

Defined in `supabase/functions/_shared/email-events.ts`. Each entry describes:
- `eventKey` — link to `email_templates.event_key`
- `label` + `description` — shown in the manager
- `variables` — which placeholders are available

`EmailTemplatesManager` shows each event as a **collapsible** item; content (subject, body, preview, test send) loads only when opened so the overview stays calm.

### Send flow

Edge function `send-template-email` (`supabase/functions/send-template-email/index.ts`):

1. Receives `{ eventKey, to, variables }` (JWT required; privileged or service-role only).
2. Loads the template from `email_templates` where `event_key = ?` and `is_enabled = true`.
3. Fills variables (`{{name}}` → value).
4. Sends via Resend with `RESEND_API_KEY`.

The payment invitation (`direct_debit_invite`, Stripe mandate) is sent by `send-direct-debit-invite` (and by `request-payment-link` when the customer asks for a new link) to the parent e-mail when known, otherwise the account e-mail. The `link` variable is the fixed payment link `/direct-debit/start?agreement=<id>&t=<token>`; it does not expire, and every send rotates the token so the previous link stops working; see `docs/integrations/stripe-abonnementen.md`. Optional list items such as `eerste_maand_regel` are passed as ready-made HTML and are empty when not applicable.

Other edge functions (`send-direct-debit-invite`, `approve-signup-request`, `schedule-trial-lesson`, …) use the same helper internally.

### Testing from the UI

In the manager you can send a **test mail** per template to your own signed-in address. Placeholder sample values come from `email-events.ts`.

---

## 3. Custom SMTP (Resend)

We use [Resend](https://resend.com) for both Supabase Auth mail and app mail.

### Configuration via `supabase/config.toml`

All SMTP settings live in `[auth.email.smtp]` and are pushed to remote projects — **no manual Dashboard config needed**.

> 📝 `pass = "env(RESEND_API_KEY)"` means the key is read from an environment variable. Ensure `RESEND_API_KEY` is in `.env.development`, GitHub Secrets, **and** Supabase Edge Function Secrets.

### Setup

1. Create an account at [resend.com](https://resend.com).
2. **Settings → API Keys** → new key.
3. **Settings → Domains** → verify domain (DNS records).
4. Add `RESEND_API_KEY=re_xxx...` to `.env.development`.

### Push SMTP

```bash
supabase link --project-ref <project-id>
supabase config push  # review diff, type Y
```

> ⚠️ The sender email (`admin_email`) must be a verified domain in Resend. For development, `xxx@resend.dev` (test domain) is allowed.

---

## 4. Project IDs (where to set SMTP and templates)

| Environment | Project ref |
|-------------|-------------|
| Development | `zdvscmogkfyddnnxzkdu` |
| Test (CI) | `jserlqacarlgtdzrblic` |
| Production | `bnagepkxryauifzyoxgo` |

## Stap 3 — één bevestiging en aanmelden zonder bankgegevens (21 oktober 2026)

- Bij een nieuwe overeenkomst verstuurt `sendAgreementConfirmation` één klantmail `agreement_created` (wizard via `send-agreement-confirmation`, duo en groepsaanmelding rechtstreeks). Bij bewerken gaat geen klantmail uit; de docentbevestiging blijft apart.
- Ontvanger: `students.parent_email`, anders account. Het `betaalblok` bevat maandbedrag met btw, eerste maand naar rato óf inhaalbedrag (direct afgeschreven), looptijd en **Machtiging afgeven**. Bedragen via `loadPaymentPreview` / `agreement_fee_months`, dezelfde bron als de vaste pagina.
- Losse variabelen: `bedrag`, `eerste_maand_bedrag`, `inhaal_bedrag`, `minimale_looptijd_tot`, `link`. Op factuur: “Je ontvangt maandelijks een factuur van ons.” Geen link.
- Elke verzending maakt een nieuwe vaste token en registreert `direct_debit_invitations`. **Opnieuw versturen** stuurt alleen `direct_debit_invite`, zichtbaar zolang geen schedule/abonnement gekoppeld is. Uitgeschakelde templates tellen niet als verstuurd; de wizard toont een waarschuwing.
- Publieke aanmelding vraagt geen IBAN/tenaamstelling/machtiging. Standaard `payment_method=stripe`; fonds aangevinkt → `manual` (op factuur). Goedkeuring/wizard neemt dit over. Oude SEPA-kolommen blijven ongemoeid; nieuwe aanmeldingen schrijven ze niet.
- Migratie vervangt alleen de exacte oude standaardbevestiging; aangepaste templates blijven behouden. Voeg daarin zelf `{{betaalblok}}` toe via Instellingen → E-mailtemplates.
- Stap 4 (wachtstatus, beheeroverzicht en portaalmelding) is niet uitgevoerd. Groepsbetaling via iDEAL blijft fase 4; geen nieuwe checkout hiervoor.
- Previewcontrole: nieuwe overeenkomst → één klantmail met juiste ontvanger/bedragen; bewerken → geen mail; opnieuw versturen → oude link ongeldig; template uit → waarschuwing; aanmelden met/zonder fonds → overeenkomst op factuur/automatisch.
- Na migratie: gebruiker draait `bun run db:reset` (of alleen types `bun run supabase:types`).
