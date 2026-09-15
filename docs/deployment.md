# Deployment naar Productie

Na het mergen van een PR naar `main` worden migraties via de Supabase GitHub Integration automatisch toegepast op het production-project. Edge functions en config-pushes blijven handmatig (of via CLI).

---

## Wanneer wat?

| Wijziging | Actie |
|-----------|-------|
| Database migraties (`supabase/migrations/`) | Automatisch via Supabase GitHub Integration na merge naar `main`. |
| Auth/config wijzigingen (`supabase/config.toml`) | Handmatig: `supabase config push`. |
| Edge Functions | Handmatig: `supabase functions deploy <name>`. |
| Frontend code | Automatisch (Lovable deploy). |
| CSP (Content-Security-Policy) | Meta-tag in `index.html` (meereist met Lovable publish). Geen HTTP-header: prod draait op Lovable hosting, niet op eigen Cloudflare/Vercel. |

---

## Content-Security-Policy (Lovable hosting)

Productie staat op **Lovable Cloud** (`mcp.mplifi.nl`). Lovable levert HSTS/nosniff/referrer-policy, maar geen configureerbare HTTP CSP-header zonder externe host of CDN-login.

Daarom staat CSP als **meta-tag** in `index.html`:

- Werkt na elke Lovable publish (zit in de gebouwde HTML).
- `connect-src` / `img-src` gebruiken `https://*.supabase.co` zodat dev, test en prod werken.
- `frame-ancestors` is niet mogelijk via meta; clickjacking blijft deels platform-afhankelijk.

Voor een volledige HTTP CSP (Report-Only, `frame-ancestors`): frontend extern hosten — zie [Deploying outside Lovable](https://docs.lovable.dev/tips-tricks/external-deployment-hosting) (Vercel/Netlify + `vercel.json` of `_headers`).

---

## Stap 1: Link aan Production

```bash
supabase link --project-ref bnagepkxryauifzyoxgo
```

## Stap 2: Migraties controleren

```bash
supabase db push --dry-run
# Migraties worden normaal automatisch toegepast; gebruik dit alleen als sanity check.
```

## Stap 2b: Bootstrap-seed op productie (optioneel)

Migraties bevatten geen referentiedata. Voor lestypes, e-mailtemplates en accounting-defaults staat [`supabase/seeds/bootstrap.sql`](../supabase/seeds/bootstrap.sql). Productie heeft `enabled = false` voor seed; pas bootstrap **handmatig** toe na nieuwe bootstrap-events:

```bash
supabase link --project-ref bnagepkxryauifzyoxgo
supabase db push --include-seed
```

Alleen `bootstrap.sql` draait op prod (geen `test.sql`). Idempotent — overschrijft geen bestaande aangepaste templates. **Nooit** `db reset --linked` op productie.

## Stap 3: Config pushen (indien gewijzigd)

```bash
supabase link --project-ref bnagepkxryauifzyoxgo
supabase config push   # review diff, type Y
```

> ⚠️ `config push` overschrijft remote settings. Review altijd de diff!

Productie-auth (`[remotes.prod.auth]` in `config.toml`):

- `enable_signup = false` — geen publieke registratie via de Auth API; nieuwe users alleen via admin/edge functions (`create-user`, `approve-signup-request`, …). Login (magic link/OTP), `/aanmelden` en staff-flows blijven werken.
- Strakkere rate limits en e-mailfrequentie (zie `[remotes.prod.auth.email]` / `[remotes.prod.auth.rate_limit]`).

## Stap 4: Edge Functions deployen

```bash
supabase functions deploy <function-name>
# of alles in één keer:
supabase functions deploy
```

---

## Beschikbare Edge Functions

| Function | Doel | Vereiste secrets |
|----------|------|------------------|
| `delete-user` | AVG: account verwijderen (self of admin). | Standaard (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) |
| `create-user` | Admin-script-only: gebruiker aanmaken met optioneel wachtwoord. | Standaard |
| `submit-signup-request` | Publieke aanmeldformulieren (proefles, inschrijving). | Standaard, `RESEND_API_KEY` |
| `approve-signup-request` | Admin keurt aanmelding goed → user + welkomstmail. | Standaard, `RESEND_API_KEY` |
| `schedule-trial-lesson` | Plant een proefles in de agenda na intake. | Standaard, `RESEND_API_KEY` |
| `send-template-email` | Verzendt e-mail op basis van `email_templates` + variabelen. | Standaard, `RESEND_API_KEY` |
| `send-incasso-invite` | Genereert magic link voor SEPA-onboarding en mailt deze. | Standaard, `RESEND_API_KEY` |
| `create-subscription-checkout` | Maakt Stripe Checkout (iDEAL setup) of activeert direct op bestaand mandaat. | Standaard, `STRIPE_SECRET_KEY` |
| `create-customer-portal` | Opent Stripe Customer Portal voor klant of (privileged) namens klant. | Standaard, `STRIPE_SECRET_KEY` |
| `sync-stripe-subscription` | Re-sync van één subscription uit Stripe naar DB. | Standaard, `STRIPE_SECRET_KEY` |
| `rebuild-subscription-schedule` | Herberekent toekomstige schedule-fases na prijswijziging. | Standaard, `STRIPE_SECRET_KEY` |
| `force-start-subscription` | Dev/test only: cancel huidige schedule en start direct. UI achter `import.meta.env.DEV`. | Standaard, `STRIPE_SECRET_KEY` |
| `stripe-webhook` | Verwerkt Stripe events (setup, subscription, invoice). **`verify_jwt = false`** vereist. | Standaard, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |

> 💡 "Standaard" = de automatisch geïnjecteerde Supabase env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`). Zie [secrets.md](./secrets.md).

---

## Edge Functions structuur

Gedeelde helpers staan in `supabase/functions/_shared/`:

- `cors.ts` — gedeelde CORS headers (browser invocations).
- `errors.ts` — `getSafeErrorMessage` voorkomt het lekken van interne stack traces.
- `billing.ts` — schoolyear, occurrences, `calculateYearly`, `pickAgeTariff`, schedule-fase-bouwers.
- `stripe.ts` — Stripe client constructor.
- `subscription-storage.ts` — DB upserts voor `subscriptions`.
- `email-events.ts` — register van app-mail events (event keys + variabelen).

### Nieuwe Edge Function aanmaken

1. Map: `supabase/functions/<function-name>/index.ts`
2. Importeer `corsHeaders` uit `../_shared/cors.ts`.
3. Handle `OPTIONS` voor preflight.
4. Wrap errors met `getSafeErrorMessage`.
5. Configureer in `supabase/config.toml`:

```toml
[functions.<name>]
verify_jwt = true   # of false voor publieke endpoints (stripe-webhook)
```

> ⚠️ Met `verify_jwt = false` moet je zelf JWT/auth validatie doen — zie [troubleshooting.md](./troubleshooting.md#verify_jwt--true-geeft-401-bij-post).

---

## Checklist na merge naar `main`

- [ ] Supabase GitHub Integration heeft migraties toegepast (check Dashboard → Database → Migrations).
- [ ] `supabase config push` als `config.toml` is gewijzigd.
- [ ] `supabase functions deploy` voor gewijzigde edge functions.
- [ ] Productie smoke-test: login, agenda, één Stripe-flow.
