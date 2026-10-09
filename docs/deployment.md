# Deployment to Production

After merging a PR to `main`, migrations are applied automatically to the production project via the Supabase GitHub Integration. Edge functions and config pushes stay manual (or via CLI).

---

## What to do when?

| Change | Action |
|--------|--------|
| Database migrations (`supabase/migrations/`) | Automatic via Supabase GitHub Integration after merge to `main`. |
| Auth/config changes (`supabase/config.toml`) | Manual: `supabase config push`. |
| Edge Functions | Manual: `supabase functions deploy <name>`. |
| Frontend code | Automatic (Lovable deploy). |
| CSP (Content-Security-Policy) | Meta tag in `index.html` (ships with Lovable publish). No HTTP header: prod runs on Lovable hosting, not on your own Cloudflare/Vercel. |

---

## Content-Security-Policy (Lovable hosting)

Production is on **Lovable Cloud** (`mcp.mplifi.nl`). Lovable provides HSTS/nosniff/referrer-policy, but no configurable HTTP CSP header without an external host or CDN login.

Therefore CSP is a **meta tag** in `index.html`:

- Works after every Lovable publish (it is in the built HTML).
- `connect-src` / `img-src` use `https://*.supabase.co` so that dev, test, and prod work.
- `img-src` also allows `https://flagcdn.com` for country flags in the land picker.
- `frame-ancestors` is not possible via meta; clickjacking remains partly platform-dependent.

For a full HTTP CSP (Report-Only, `frame-ancestors`): host the frontend elsewhere — see [Deploying outside Lovable](https://docs.lovable.dev/tips-tricks/external-deployment-hosting) (Vercel/Netlify + `vercel.json` or `_headers`).

---

## Step 1: Link to Production

```bash
supabase link --project-ref bnagepkxryauifzyoxgo
```

## Step 2: Check migrations

```bash
supabase db push --dry-run
# Migrations are normally applied automatically; use this only as a sanity check.
```

## Step 2b: Bootstrap seed on production (optional)

Migrations do not contain reference data. Lesson types, email templates, and accounting defaults live in [`supabase/seeds/bootstrap.sql`](../supabase/seeds/bootstrap.sql). Production has `enabled = false` for seed; apply bootstrap **manually** after new bootstrap events:

```bash
supabase link --project-ref bnagepkxryauifzyoxgo
supabase db push --include-seed
```

Only `bootstrap.sql` runs on prod (not `test.sql`). Idempotent — does not overwrite existing custom templates. **Never** run `db reset --linked` on production.

## Step 3: Push config (if changed)

```bash
supabase link --project-ref bnagepkxryauifzyoxgo
supabase config push   # review diff, type Y
```

> ⚠️ `config push` overwrites remote settings. Always review the diff!

Production auth (`[remotes.prod.auth]` in `config.toml`):

- `enable_signup = false` — no public registration via the Auth API; new users only via admin/edge functions (`create-user`, `approve-signup-request`, …). Login (magic link/OTP), `/signup`, and staff flows still work.
- Tighter rate limits and email frequency (see `[remotes.prod.auth.email]` / `[remotes.prod.auth.rate_limit]`).

## Step 4: Deploy Edge Functions

```bash
supabase functions deploy <function-name>
# or everything at once:
supabase functions deploy
```

---

## Available Edge Functions

| Function | Purpose | Required secrets |
|----------|---------|------------------|
| `delete-user` | GDPR: delete account (self or admin). | Standard (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) |
| `create-user` | Admin-script only: create a user with optional password. | Standard |
| `submit-signup-request` | Public signup forms (trial lesson, enrolment). | Standard, `RESEND_API_KEY` |
| `approve-signup-request` | Admin approves signup → user + welcome email. | Standard, `RESEND_API_KEY` |
| `schedule-trial-lesson` | Schedules a trial lesson on the agenda after intake. | Standard, `RESEND_API_KEY` |
| `send-template-email` | Sends email from `email_templates` + variables. | Standard, `RESEND_API_KEY` |
| `send-direct-debit-invite` | Generates a magic link for SEPA onboarding and emails it. | Standard, `RESEND_API_KEY` |
| `create-subscription-checkout` | Creates Stripe Checkout (iDEAL setup) or activates immediately on an existing mandate. | Standard, `STRIPE_SECRET_KEY` |
| `create-customer-portal` | Opens Stripe Customer Portal for the customer or (privileged) on their behalf. | Standard, `STRIPE_SECRET_KEY` |
| `sync-stripe-subscription` | Re-sync one subscription from Stripe into the DB. | Standard, `STRIPE_SECRET_KEY` |
| `rebuild-subscription-schedule` | Recalculates future schedule phases after a price change. | Standard, `STRIPE_SECRET_KEY` |
| `force-start-subscription` | Dev/test only: cancel current schedule and start immediately. UI behind `import.meta.env.DEV`. | Standard, `STRIPE_SECRET_KEY` |
| `stripe-webhook` | Handles Stripe events (setup, subscription, invoice). **`verify_jwt = false`** required. | Standard, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |

> 💡 "Standard" = the auto-injected Supabase env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`). See [secrets.md](./secrets.md).

---

## Edge Functions structure

Shared helpers live in `supabase/functions/_shared/`:

- `cors.ts` — shared CORS headers (browser invocations).
- `errors.ts` — `getSafeErrorMessage` prevents leaking internal stack traces.
- `billing.ts` — school year, occurrences, `calculateYearly`, `pickAgeTariff`, schedule-phase builders.
- `stripe.ts` — Stripe client constructor.
- `subscription-storage.ts` — DB upserts for `subscriptions`.
- `email-events.ts` — register of app mail events (event keys + variables).

### Creating a new Edge Function

1. Folder: `supabase/functions/<function-name>/index.ts`
2. Import `corsHeaders` from `../_shared/cors.ts`.
3. Handle `OPTIONS` for preflight.
4. Wrap errors with `getSafeErrorMessage`.
5. Configure in `supabase/config.toml`:

```toml
[functions.<name>]
verify_jwt = true   # or false for public endpoints (stripe-webhook)
```

> ⚠️ With `verify_jwt = false` you must validate JWT/auth yourself — see [troubleshooting.md](./troubleshooting.md#verify_jwt--true-returns-401-on-post).

---

## Checklist after merge to `main`

- [ ] Supabase GitHub Integration applied migrations (check Dashboard → Database → Migrations).
- [ ] `supabase config push` if `config.toml` changed.
- [ ] `supabase functions deploy` for changed edge functions.
- [ ] Production smoke test: login, agenda, one Stripe flow.
