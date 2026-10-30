# Stripe billing (per lesson agreement)

Stripe is the sole payment source of truth. Each active `lesson_agreements` row can have one Subscription Schedule for monthly collection. There is no local SEPA/batch/invoice stack and no nightly billing cron.

## 1. What we do

- **Setup:** the payer opens a fixed payment link (no login), completes **iDEAL** Checkout, and creates a reusable payment method.
- **After mandate:** webhook creates a `SubscriptionSchedule` with monthly phases (school year, age tariff, August pause).
- **Late mandate:** if the agreement start month is already past, one **catch-up invoice** covers missed billing months; remaining months stay on the schedule.
- **Catalog:** lesson-type option prices sync to Stripe Product/Price on write, or via `bun run stripe:sync-catalog` after `db reset`. Affected schedules rebuild on demand (no cron).

## 2. End-to-end flow

```text
[Agreement wizard]
        │
        │ 1. issue-payment-link (token) + agreement_created mail with {{betaalblok}}
        ▼
[/pay?agreement=&t=]  (public Pay.tsx)
        │
        │ 2. payment-link-info → start-payment-checkout
        ▼
[Stripe Checkout — iDEAL setup]
        │
        │ 3. setup_intent.succeeded / checkout.session.completed (webhook)
        ▼
[createScheduleForAgreement] (+ optional catch-up invoice)
        │
        ▼
[subscriptions / subscription_invoices] → monthly Stripe collection
```

Ops: **Wacht op machtiging** lists agreements without an arranged mandate; **SubscriptionCard** on the agreement can resend the link, open Customer Portal, sync, or rebuild.

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

## 4. Edge functions

| Function                        | Auth                | Purpose                                                          |
| ------------------------------- | ------------------- | ---------------------------------------------------------------- |
| `issue-payment-link`            | JWT                 | Rotate token; return `betaalblok`; optionally send mail          |
| `payment-link-info`             | public (token)      | Validate token; return lesson form + preview amounts             |
| `request-payment-link`          | public              | Rate-limited new link mail to known payer address                |
| `start-payment-checkout`        | public (token)      | Checkout / complete without login                                |
| `create-subscription-checkout`  | JWT                 | Logged-in checkout / direct / complete (staff or student)        |
| `create-customer-portal`        | JWT                 | Stripe Customer Portal                                           |
| `sync-stripe-subscription`      | JWT                 | Pull subscription from Stripe                                    |
| `rebuild-subscription-schedule` | JWT                 | Recalculate future phases after rate change                      |
| `force-start-subscription`      | JWT (admin, DEV UI) | Force-start schedule for testing                                 |
| `sync-stripe-catalog`           | JWT / service role  | Sync active lesson-type option prices; optional rebuild affected |
| `stripe-webhook`                | public (signature)  | Setup → schedule (+ catch-up); subscription/invoice mirrors      |

Shared: `_shared/billing.ts`, `billingHelpers.ts`, `catchUpInvoiceHelpers.ts`, `paymentLinkHelpers.ts`, `stripeCatalog.ts`.

## 5. Payment link & mail

- Public URL: `/pay?agreement=<uuid>&t=<token>`.
- Betaler = `students.parent_email` when set, otherwise the student account e-mail.
- Template `agreement_created` includes `{{betaalblok}}` (HTML button to the fixed link).
- “Opnieuw versturen” / public request reuse the same link + mail pattern (rate-limited on the public path).

## 6. Webhook events

| Event                                | Effect                                                         |
| ------------------------------------ | -------------------------------------------------------------- |
| `checkout.session.completed` (setup) | Attach payment method → create schedule (+ catch-up if needed) |
| `setup_intent.succeeded`             | Same schedule path when Checkout already finished              |
| `customer.subscription.*`            | Upsert `subscriptions`                                         |
| `invoice.*`                          | Upsert `subscription_invoices`                                 |

## 7. Catalog (no cron)

- On lesson-type / option save the app invokes `sync-stripe-catalog` (fire-and-forget) and may rebuild schedules for that lesson type.
- After `supabase db reset` (+ types regen), run:

```bash
bun run stripe:sync-catalog
```

## 8. Secrets

Edge only (never `VITE_`):

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`

## 9. Local testing

```bash
stripe listen --forward-to http://127.0.0.1:54421/functions/v1/stripe-webhook

bun test tests/code/billing/paymentLinkHelpers.test.ts
bun test tests/code/billing/catchUpInvoiceHelpers.test.ts
bun test tests/code/billing/calculateYearlyAmount.test.ts
```

## 10. Out of scope

Local SEPA/XML, school invoices/PDF, Exact/accounting, legacy import, “op factuur”/fonds (Stripe-only).
