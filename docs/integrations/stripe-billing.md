# Stripe billing (per lesson agreement)

Stripe is the sole payment source of truth. Each active `lesson_agreements` row can have one Subscription Schedule for monthly collection. There is no local SEPA/batch/invoice stack and no nightly billing cron.

## 1. What we do

- **Setup:** the payer opens a fixed payment link (no login), completes **iDEAL** Checkout, and creates a reusable payment method.
- **After mandate:** the **Stripe webhook** is the sole fulfillment writer — it creates a `SubscriptionSchedule` with monthly phases (school year, age tariff, August pause) and any catch-up invoice. The `/pay` (and logged-in checkout) return URL only **polls** until `stripe_schedule_id` is present; it does not create schedules.
- **Late mandate:** if the agreement start month is already past, one **catch-up invoice** covers missed billing months; remaining months stay on the schedule. Rematch after cancel reuses an existing draft/open/paid catch-up (updates the payment method and retries collection) so the payer is never charged twice for the same catch-up.
- **Tariff changes:** rebuild future schedule phases on demand via `rebuild-subscription-schedule` (per agreement or per lesson type). New amounts create a new Price under the same shared Product; youth/adult are Prices, not separate Products.
- **Catalog:** Products are created lazily on first use (empty sandbox / new production is fine). Tuition is one Product per `lesson_type_option` (metadata `lesson_type_option_id`); catch-up is one global Product named **Inhalen lesgeld** (metadata `kind=catch_up`, `scope=global`). Creates use stable idempotency keys so concurrent webhooks (`checkout.session.completed` + `setup_intent.succeeded`) share one Product/Price; after create the id is verified, and a one-off recovery key is used if a sandbox wipe left a stale idempotency replay. There is no catalog sync job.

## 2. End-to-end flow

```text
[Agreement wizard]
        │
        │ 1. issue-payment-link → agreement_created mail + stripe_checkout_invitations
        ▼
[/pay?agreement=&t=]  (public Pay.tsx)
        │
        │ 2. payment-link-info → start-payment-checkout
        ▼
[Stripe Checkout — iDEAL setup]
        │
        │ 3. setup_intent.succeeded / checkout.session.completed (webhook = fulfill)
        ▼
[createScheduleForAgreement] (+ optional catch-up invoice)
        │
        │ 4. /pay?session_id=… polls payment-link-info until arranged
        ▼
[subscriptions / subscription_invoices] → monthly Stripe collection
```

Ops: **Machtigingen** (`/mandates`) tabs: active → canceled → pending (invite sent) → unsent; header **Synchroniseer met Stripe** runs a thin reconcile (pull status / apply canceled schedules). Canceled rows can be re-offered with the same payment-invite dialog as unsent. **Open betaalscherm** issues the payment-link mail (same as send-invite) and then opens the returned `/pay` URL. **SubscriptionCard** on the agreement can resend / re-offer the link, open Customer Portal, sync one row, or rebuild.

## 3. Data model

| Table                         | Purpose                                                           |
| ----------------------------- | ----------------------------------------------------------------- |
| `stripe_customers`            | User ↔ Stripe customer                                            |
| `subscriptions`               | Mirror of Stripe Subscription + schedule id                       |
| `subscription_invoices`       | Mirror of Stripe invoices                                         |
| `stripe_checkout_invitations` | Audit of payment-link mails (recipient, `sent_at`)                |
| `agreement_payment_links`     | SHA-256 of current payment token (plaintext only at issue time)   |
| `payment_link_requests`       | Rate-limit log for “stuur nieuwe link” (max 3 / hour / agreement) |

`lesson_agreements.minimum_term_end` is set when a payment link is issued (first 6-month period end for the pay page).

### Stripe metadata (agreement coupling)

Exact site agreement identity is always `lesson_agreement_id` (UUID PK of `lesson_agreements`). Reconstruct with that key (or the local mirrors `lesson_agreements.stripe_schedule_id` / `subscriptions.*`); never by matching type + frequency + duration.

Shared agreement keys (`buildAgreementStripeMetadata`):

- `lesson_agreement_id`
- `lesson_type_id`
- `frequency`
- `duration_minutes` (string)

Where they are written:

- **Schedule** metadata: agreement keys + `school_year`; rebuild also sets `last_rebuild_at`
- **Every phase** metadata: agreement keys + `phase_label` (Stripe copies phase metadata onto the Subscription when the phase starts)
- **Forced subscription**: agreement keys + `forced_start` + `original_schedule_id`
- **Tuition Product / recurring Price**: `lesson_type_option_id` (prices also store `amount_cents`; same amount → same Price)
- **Catch-up Product**: `kind=catch_up` (single global Product)
- **Checkout / SetupIntent**: `lesson_agreement_id` + `flow=schedule_setup`
- **Catch-up invoice**: `lesson_agreement_id` + `kind=catch_up` (+ `line_month` per line)

## 4. Edge functions

| Function                        | Auth               | Purpose                                                        |
| ------------------------------- | ------------------ | -------------------------------------------------------------- |
| `issue-payment-link`            | JWT                | Rotate token; mail `agreement_created`; record checkout invite |
| `payment-link-info`             | public (token)     | Validate token; return lesson form + preview amounts           |
| `request-payment-link`          | public             | Rate-limited new link mail to known payer address              |
| `start-payment-checkout`        | public (token)     | Checkout / complete without login                              |
| `create-subscription-checkout`  | JWT                | Logged-in checkout / direct / complete (staff or student)      |
| `create-customer-portal`        | JWT                | Stripe Customer Portal                                         |
| `sync-stripe-subscription`      | JWT                | Pull one subscription from Stripe                              |
| `reconcile-stripe-mandates`     | JWT (privileged)   | Thin bulk reconcile of local mandate mirrors from Stripe       |
| `rebuild-subscription-schedule` | JWT                | Recalculate future phases after rate change                    |
| `force-start-subscription`      | JWT (admin)        | Force-start schedule (API / ops; no app UI)                    |
| `stripe-webhook`                | public (signature) | Setup → schedule (+ catch-up); subscription/invoice mirrors    |

Shared: `_shared/billing.ts`, `billingHelpers.ts`, `catchUpInvoiceHelpers.ts`, `paymentLinkHelpers.ts`.

## 5. Payment link & mail

- Public URL: `/pay?agreement=<uuid>&t=<token>`.
- Betaler = `students.parent_email` when set, otherwise the student account e-mail.
- **Single gate for payer mail:** staff/wizard paths send `agreement_created` only via `issue-payment-link` (always mails + records `stripe_checkout_invitations`). Public `request-payment-link` issues the same mail + invite row itself. Never send a betaallink `agreement_created` through `send-template-email` alone — Machtigingen **In afwachting** would miss it.
- Template `agreement_created` includes `{{betaalblok}}` (HTML button to the fixed link).
- Teacher confirmation (`agreement_created_teacher`) stays on `send-template-email` (no checkout invite row).

## 6. Webhook events

| Event                                | Effect                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| `checkout.session.completed` (setup) | Attach payment method → create schedule (+ catch-up if needed)                      |
| `setup_intent.succeeded`             | Same schedule path when Checkout already finished                                   |
| `customer.subscription.*`            | Upsert `subscriptions`; clear agreement schedule id when status is `canceled`       |
| `subscription_schedule.canceled`     | Mark local subscription `canceled` and clear `lesson_agreements.stripe_schedule_id` |
| `invoice.*`                          | Upsert `subscription_invoices`                                                      |

Canonical subscribe list: `STRIPE_WEBHOOK_ENABLED_EVENTS` in `stripeWebhookHandlersHelpers.ts`. Same env targets as `db:reset`:

```bash
bun run stripe:setup:webhooks              # local → Stripe CLI listen instructions
bun run stripe:setup:webhooks development
bun run stripe:setup:webhooks test
bun run stripe:setup:webhooks production   # confirmTarget; requires sk_live_…
# optional tunnel / explicit URL:
bun run stripe:setup:webhooks local --url=https://…/functions/v1/stripe-webhook
```

Creates/updates snapshot Event Destination `mcp-stripe-webhook` (Your account). On **create**, copy the printed `whsec_…` into `$SECRETS_PATH/supabase/.env.<env>` as `STRIPE_WEBHOOK_SECRET`, then `bun run db:push:secrets <env>`. Re-runs only refresh the event list (secret unchanged).

## 7. Secrets

Edge only (never `VITE_`):

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`

## 8. Local testing

### Wipe sandbox Stripe (`stripe:reset:customers`)

Same CLI shape as `db:reset`: target via `[local|development|dev|test]`. Destructive for **Stripe test mode** (`sk_test_…`) against the matching non-production database. **Production is never allowed.**

Deletes all Stripe Customers and clears local subscriptions / customers / payment links / invites plus `lesson_agreements.stripe_schedule_id` / `minimum_term_end`. Shared Products (`lesson_type_option_id` / catch-up) stay in the Stripe Dashboard when you use this script and are reused on the next mandate. A full Dashboard “Delete test data” wipe removes Products too — the next mandate recreates them via search-or-create (no stale forever idempotency keys).

```bash
bun run stripe:reset:customers              # local Docker
bun run stripe:reset:customers development  # mcp-dev
bun run stripe:reset:customers test
```

Guards: refuses `production` / prod Supabase URL and any `sk_live_…` key. Confirmation follows `supabase.json` `targets.*.confirm` (same as `db:reset`). Loads `SUPABASE_*` from the target runtime env and `STRIPE_SECRET_KEY` from that target’s edge secrets file.

Alongside `bun run dev:local`, forward Stripe events to the local edge function. One-time CLI setup (correct sandbox first):

```bash
stripe login
stripe switch                    # pick the local sandbox (not live)
stripe listen --print-secret     # copy whsec_…
```

Put that `whsec_…` in `$SECRETS_PATH/supabase/.env.local` as `STRIPE_WEBHOOK_SECRET`, then `bun run db:push:secrets` and `bun run supabase:restart`. After that, keep the forwarder running:

```bash
bun run stripe:webhook
# optional verbose CLI logs + drop websocket ping/pong from the log file:
bun run stripe:webhook -- --log-level debug --log-exclude ping-pong
# file-only CLI output (no terminal mirror; useful when sharing a shell with Vite):
bun run stripe:webhook -- --log-terminal off
```

Each start truncates `logs/stripe.log` and mirrors the Stripe CLI output there (terminal + file) through the same filters. Pass `--log-level` through to the Stripe CLI when needed (`debug` | `info` | `trace` | `warn` | `error`); default is omit (CLI `info`). The chosen level is written once as `log level: …` at the top; Stripe `time=` / event timestamps are stripped and logfmt `msg="…"` is unwrapped; every line then gets `[HH:mm:ss]` via the shared console clock helper. `--log-exclude ping-pong` skips websocket ping/pong lines in both terminal and file. `--log-terminal off` keeps writing CLI stdout+stderr to the log file but stops mirroring either stream to the terminal (default `on`). Secrets (`whsec_…` / `sk_…` / `rk_…`) are redacted to a short hint (`whsec_abcd**`, `sk_test_abcd**`) in both places so you can tell which secret was printed without logging the full value.

```bash
bun test tests/code/billing/paymentLinkHelpers.test.ts
bun test tests/code/billing/catchUpInvoiceHelpers.test.ts
bun test tests/code/billing/calculateYearlyAmount.test.ts
```

## 9. Out of scope

Local SEPA/XML, school invoices/PDF, Exact/accounting, legacy import, “op factuur”/fonds (Stripe-only).
