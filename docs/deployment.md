# Deployment to Production

After merging a PR to `main`, migrations are applied automatically to the production project via the Supabase GitHub Integration. Edge functions and config pushes stay manual (or via CLI).

Remote project refs live in root [`supabase.json`](../supabase.json).

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

Prefer `bun run db:* production`. Raw CLI uses `--remote=<production projectRef from supabase.json>` (no ambient link required). Set `SUPABASE_DB_PASSWORD` in `$SECRETS_PATH/.env.production.local`.

## Step 2: Check migrations

```bash
supabase db push --remote=<production-project-ref> --dry-run
# Migrations are normally applied automatically; use this only as a sanity check.
# Or: bun run db:push:migrations production
```

## Step 2b: Bootstrap seed on production (optional)

Migrations do not contain reference data. Email templates and app defaults live in [`supabase/seeds/bootstrap.sql`](../supabase/seeds/bootstrap.sql). Default lesson types live in [`supabase/seeds/lesson-types.sql`](../supabase/seeds/lesson-types.sql) (dev/test only). Production seed applies **bootstrap only**; apply bootstrap **manually** after new bootstrap events:

```bash
supabase db push --remote=<production-project-ref> --include-seed --yes
```

Only `bootstrap.sql` runs on prod (not `test.sql`). Idempotent — does not overwrite existing custom templates. **Never** run `db reset --remote=…` on production.

## Step 3: Push config (if changed)

```bash
bun run db:push:config production
# or: supabase config push --remote=<production-project-ref>
```

> ⚠️ `config push` shows a diff and asks before writing (default no). Review carefully — it overwrites remote Auth/Storage/… settings that the file declares.

Production auth (`[remotes.prod.auth]` in `config.toml`):

- `enable_signup = false` — no public registration via the Auth API; new users only via admin/edge functions (`create-user`, `approve-signup-request`, …). Login (magic link/OTP), `/signup`, and staff flows still work.
- Tighter rate limits and email frequency (see `[remotes.prod.auth.email]` / `[remotes.prod.auth.rate_limit]`).

## Step 4: Deploy Edge Functions

```bash
bun run db:push:functions production
# or: supabase functions deploy --remote=<production-project-ref> --yes
# single function: supabase functions deploy <name> --remote=<production-project-ref> --yes
```

---

## Available Edge Functions

| Function                        | Purpose                                                                              | Required secrets                                       |
| ------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `delete-user`                   | GDPR: delete account (self or admin).                                                | Standard (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) |
| `create-user`                   | Admin-script only: create a user with optional password.                             | Standard                                               |
| `submit-signup-request`         | Public signup forms (trial lesson, enrolment).                                       | Standard, `RESEND_API_KEY`                             |
| `approve-signup-request`        | Admin approves signup → user + welcome email.                                        | Standard, `RESEND_API_KEY`                             |
| `schedule-trial-lesson`         | Schedules a trial lesson on the agenda after intake.                                 | Standard, `RESEND_API_KEY`                             |
| `send-template-email`           | Sends email from `email_templates` + variables.                                      | Standard, `RESEND_API_KEY`                             |
| `issue-payment-link`            | Rotate `/pay` token; mail `agreement_created`; invite audit row.                     | Standard, `RESEND_API_KEY`                             |
| `payment-link-info`             | Public token: pay-page payload + arranged poll. **`verify_jwt = false`**.            | Standard                                               |
| `request-payment-link`          | Public rate-limited re-mail of payment link. **`verify_jwt = false`**.               | Standard, `RESEND_API_KEY`                             |
| `start-payment-checkout`        | Public token: Stripe Checkout setup only. **`verify_jwt = false`**.                  | Standard, `STRIPE_SECRET_KEY`                          |
| `create-subscription-checkout`  | JWT: checkout / direct / complete (complete = poll; webhook fulfills).               | Standard, `STRIPE_SECRET_KEY`                          |
| `create-customer-portal`        | Stripe Customer Portal.                                                              | Standard, `STRIPE_SECRET_KEY`                          |
| `sync-stripe-subscription`      | Pull one subscription from Stripe.                                                   | Standard, `STRIPE_SECRET_KEY`                          |
| `reconcile-stripe-mandates`     | Privileged bulk mandate reconcile (Machtigingen).                                    | Standard, `STRIPE_SECRET_KEY`                          |
| `rebuild-subscription-schedule` | Recalculate future phases after a price change.                                      | Standard, `STRIPE_SECRET_KEY`                          |
| `force-start-subscription`      | Ops: force-start schedule (no app UI).                                               | Standard, `STRIPE_SECRET_KEY`                          |
| `stripe-webhook`                | Fulfill schedule + catch-up; subscription/invoice mirrors. **`verify_jwt = false`**. | Standard, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |

> 💡 "Standard" = auto-injected Supabase env (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`). See [secrets.md](./secrets.md). Stripe invariants: [integrations/stripe-billing.md](./integrations/stripe-billing.md).

---

## Edge Functions structure

Shared under `supabase/functions/_shared/` (billing: `billing.ts` / `billingHelpers.ts`, `catchUpInvoice.ts` / `catchUpInvoiceHelpers.ts`, `paymentLink.ts` / `paymentLinkHelpers.ts`; also `cors.ts`, `stripe.ts`, `subscription-storage.ts`, `email-events.ts`).

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
