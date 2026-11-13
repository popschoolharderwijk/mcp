# Stripe billing

Stripe is the only payment source of truth. One `SubscriptionSchedule` per active `lesson_agreements` row. No local SEPA/batch stack, no nightly billing cron.

## Invariants (do not reverse)

1. **Webhook fulfills.** `checkout.session.completed` / `setup_intent.succeeded` create the schedule (+ catch-up). Return URLs (`/pay`, logged-in checkout) only **poll** until `stripe_schedule_id` is set — they never create schedules.
2. **Public pay path:** `/pay?agreement=&t=` → `payment-link-info` → `start-payment-checkout` (Checkout setup only). After Stripe return, poll `payment-link-info`.
3. **Payer mail gate:** betaallink `agreement_created` only via `issue-payment-link` or `request-payment-link` (both write `stripe_checkout_invitations`). Never send that mail through `send-template-email` alone — Machtigingen **In afwachting** would miss it.
4. **Identity:** always `lesson_agreement_id` on Stripe objects. Never rematch by type + frequency + duration.
5. **Catalog:** one tuition Product per `lesson_type_option_id`; one global catch-up Product (`kind=catch_up`, `scope=global`, name **Inhalen lesgeld**). Youth/adult = Prices under the same Product. Lazy create; no sync job. Stable idempotency keys + verify + recovery key after sandbox wipe (search can replay deleted ids).
6. **Dual webhooks:** both setup events may race the same idempotency key → Stripe `409 idempotency_key_in_use` is expected; catch-up/catalog writers retry briefly.
7. **Catch-up:** late mandate → one catch-up invoice for missed months; rematch reuses draft/open/paid catch-up (update PM, retry) — never double-charge.

## Flow

```text
issue-payment-link → /pay?agreement=&t=
  → start-payment-checkout (iDEAL setup)
  → webhook: createScheduleForAgreement (+ catch-up)
  → /pay?session_id=… polls until arranged
```

Ops UI: **Machtigingen** (`/mandates`); **Open betaalscherm** = issue link + open `/pay`. Logged-in `/stripe/checkout/start` is secondary (JWT checkout).

## Tables

| Table                                     | Role                                      |
| ----------------------------------------- | ----------------------------------------- |
| `stripe_customers`                        | user ↔ Stripe customer                    |
| `subscriptions` / `subscription_invoices` | Stripe mirrors                            |
| `stripe_checkout_invitations`             | audit of payment-link mails               |
| `agreement_payment_links`                 | SHA-256 of current token                  |
| `payment_link_requests`                   | rate limit for public “nieuwe link” (3/h) |

`lesson_agreements.minimum_term_end` set when a payment link is issued.

## Metadata

`buildAgreementStripeMetadata`: `lesson_agreement_id`, `lesson_type_id`, `frequency`, `duration_minutes`.

Also: schedule `school_year` (+ `last_rebuild_at` on rebuild); phase `phase_label`; tuition Product/Price `lesson_type_option_id` (+ `amount_cents` on Price); catch-up Product `kind=catch_up`; Checkout/SetupIntent `flow=schedule_setup`; catch-up invoice `kind=catch_up` (+ `line_month`).

## Edge functions

| Function                        | Auth            | Role                                                  |
| ------------------------------- | --------------- | ----------------------------------------------------- |
| `issue-payment-link`            | JWT (own check) | rotate token; mail; invite row                        |
| `payment-link-info`             | token           | pay page + poll “arranged”                            |
| `request-payment-link`          | public          | rate-limited re-mail                                  |
| `start-payment-checkout`        | token           | Checkout setup only                                   |
| `create-subscription-checkout`  | JWT             | checkout / direct / complete (complete = poll status) |
| `create-customer-portal`        | JWT             | portal                                                |
| `sync-stripe-subscription`      | JWT             | pull one row                                          |
| `reconcile-stripe-mandates`     | privileged      | Machtigingen sync                                     |
| `rebuild-subscription-schedule` | JWT             | future phases after rate change                       |
| `force-start-subscription`      | admin           | ops only, no UI                                       |
| `stripe-webhook`                | signature       | fulfill + mirrors                                     |

Shared: `_shared/billing.ts`, `billingHelpers.ts`, `catchUpInvoice.ts`, `catchUpInvoiceHelpers.ts`, `paymentLink.ts`, `paymentLinkHelpers.ts`. Event list: `STRIPE_WEBHOOK_ENABLED_EVENTS`.

## Secrets (edge only)

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` — never `VITE_`.

## Local

```bash
bun run stripe:setup:webhooks [local|development|test|production]
bun run stripe:reset:customers [local|development|test]   # never production; keeps shared Products
bun run stripe:webhook   # CLI forward → logs/stripe.log
```

`stripe:reset:customers` clears customers + local billing mirrors. Dashboard “Delete test data” also wipes Products; next mandate recreates via search-or-create.

## Out of scope

Local SEPA/XML, school PDF invoices, Exact, “op factuur”/fonds.
