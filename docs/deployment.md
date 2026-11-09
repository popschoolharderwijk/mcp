# Deployment to Production

After merging a PR to `main`, migrations are applied automatically to the production project via the Supabase GitHub Integration. Edge functions and config pushes stay manual (or via CLI).

---

## What to do when?

| Change                                       | Action                                                                                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Database migrations (`supabase/migrations/`) | Automatic via Supabase GitHub Integration after merge to `main`.                                                                        |
| Auth/config changes (`supabase/config.toml`) | Manual: `bun run db:push:config production`.                                                                                            |
| Edge Functions                               | Manual: `bun run db:push:functions production`.                                                                                         |
| Frontend code                                | Automatic (Lovable deploy).                                                                                                             |
| CSP (Content-Security-Policy)                | Meta tag in `index.html` (ships with Lovable publish). No HTTP header: prod runs on Lovable hosting, not on your own Cloudflare/Vercel. |

---

## Content-Security-Policy (Lovable hosting)

Production is on **Lovable Cloud** (`mcp.mplifi.nl`). Lovable provides HSTS/nosniff/referrer-policy, but no configurable HTTP CSP header without an external host or CDN login.

Therefore CSP is a **meta tag** in `index.html`:

- Works after every Lovable publish (it is in the built HTML).
- `connect-src` / `img-src` use `https://*.supabase.co` so that remote dev, test, and prod work; local Docker also allows `http://127.0.0.1:54421` / `http://localhost:54421` (and matching `ws://`).
- `img-src` also allows `https://flagcdn.com` for country flags in the land picker.
- `frame-ancestors` is not possible via meta; clickjacking remains partly platform-dependent.

For a full HTTP CSP (Report-Only, `frame-ancestors`): host the frontend elsewhere — see [Deploying outside Lovable](https://docs.lovable.dev/tips-tricks/external-deployment-hosting) (Vercel/Netlify + `vercel.json` or `_headers`).

---

## Step 1: Target production (CLI v3)

Prefer `bun run db:* production`. Raw CLI uses `--remote=bnagepkxryauifzyoxgo` (no ambient link required). Set `SUPABASE_DB_PASSWORD` in `$SECRETS_PATH/.env.production.local`.

## Step 2: Check migrations

```bash
supabase db push --remote=bnagepkxryauifzyoxgo --dry-run
# Migrations are normally applied automatically; use this only as a sanity check.
# Or: bun run db:push:migrations production
```

## Step 2b: Bootstrap seed on production (optional)

Migrations do not contain reference data. Email templates and app defaults live in [`supabase/seeds/bootstrap.sql`](../supabase/seeds/bootstrap.sql). Default lesson types live in [`supabase/seeds/lesson-types.sql`](../supabase/seeds/lesson-types.sql) (dev/test only). Production seed applies **bootstrap only**; apply bootstrap **manually** after new bootstrap events:

```bash
supabase db push --remote=bnagepkxryauifzyoxgo --include-seed --yes
```

Only `bootstrap.sql` runs on prod (not `test.sql`). Idempotent — does not overwrite existing custom templates. **Never** run `db reset --remote=…` on production.

## Step 3: Push config (if changed)

```bash
bun run db:push:config production
# or: supabase config push --remote=bnagepkxryauifzyoxgo
```

> ⚠️ `config push` shows a diff and asks before writing (default no). Review carefully — it overwrites remote Auth/Storage/… settings that the file declares.

Production auth (`[remotes.prod.auth]` in `config.toml`):

- `enable_signup = false` — no public registration via the Auth API; new users only via admin/edge functions (`create-user`, `approve-signup-request`, …). Login (magic link/OTP), `/signup`, and staff flows still work.
- Tighter rate limits and email frequency (see `[remotes.prod.auth.email]` / `[remotes.prod.auth.rate_limit]`).

## Step 4: Deploy Edge Functions

```bash
bun run db:push:functions production
# or: supabase functions deploy --remote=bnagepkxryauifzyoxgo --yes
# single function: supabase functions deploy <name> --remote=bnagepkxryauifzyoxgo --yes
```

---

## Available Edge Functions

| Function                        | Purpose                                                                                  | Required secrets                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `delete-user`                   | GDPR: delete account (self or admin).                                                    | Standard (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) |
| `create-user`                   | Admin-script only: create a user with optional password.                                 | Standard                                               |
| `submit-signup-request`         | Public signup forms (trial lesson, enrolment).                                           | Standard, `RESEND_API_KEY`                             |
| `approve-signup-request`        | Admin approves signup → user + welcome email.                                            | Standard, `RESEND_API_KEY`                             |
| `schedule-trial-lesson`         | Schedules a trial lesson on the agenda after intake.                                     | Standard, `RESEND_API_KEY`                             |
| `send-template-email`           | Sends email from `email_templates` + variables.                                          | Standard, `RESEND_API_KEY`                             |
| `send-stripe-checkout-invite`   | Generates a magic link for Stripe Checkout onboarding and emails it.                     | Standard, `RESEND_API_KEY`                             |
| `create-subscription-checkout`  | Creates Stripe Checkout (iDEAL setup) or activates immediately on an existing mandate.   | Standard, `STRIPE_SECRET_KEY`                          |
| `create-customer-portal`        | Opens Stripe Customer Portal for the customer or (privileged) on their behalf.           | Standard, `STRIPE_SECRET_KEY`                          |
| `sync-stripe-subscription`      | Re-sync one subscription from Stripe into the DB.                                        | Standard, `STRIPE_SECRET_KEY`                          |
| `rebuild-subscription-schedule` | Recalculates future schedule phases after a price change.                                | Standard, `STRIPE_SECRET_KEY`                          |
| `force-start-subscription`      | Ops/test: cancel current schedule and start immediately (no app UI).                     | Standard, `STRIPE_SECRET_KEY`                          |
| `stripe-webhook`                | Handles Stripe events (setup, subscription, invoice). **`verify_jwt = false`** required. | Standard, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |

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
- [ ] `bun run db:push:config production` if `config.toml` changed.
- [ ] `bun run db:push:functions production` for changed edge functions.
- [ ] Production smoke test: login, agenda, one Stripe flow.
