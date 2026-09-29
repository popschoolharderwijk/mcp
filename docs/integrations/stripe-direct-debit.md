# Stripe direct debit (SEPA, per lesson agreement)

One document for the full Stripe flow: from the invitation email to monthly SEPA collection, including schedule phases, webhooks, and admin.

> Replaces the older document `stripe-subscriptions.md` (removed 13 May 2026).

## 1. What we do

For each `lesson_agreements` row we attach **one Stripe `Subscription`** for monthly collection.

- **First step (setup):** the customer picks a payment method via **iDEAL** in Stripe Checkout (required in NL to issue a SEPA mandate).
- **After that:** monthly automatic collection via **SEPA Direct Debit** on the issued mandate.
- **Schedule phases:** a `SubscriptionSchedule` sets the exact amount per month so holidays and the correct age category (VAT) are folded into a fixed monthly instalment.
- **Management:** the customer manages payment method/invoice/cancellation via the Stripe **Customer Portal**; an admin can open the portal on their behalf.

## 2. End-to-end flow

```text
[Agreement (admin)]
        │
        │ 1. SubscriptionCard → "Stuur betaaluitnodiging"
        ▼
[send-direct-debit-invite] ──► magic-link mail to student/parent
                                │
                                │ 2. click link
                                ▼
                       [/direct-debit/start]  (DirectDebitStart.tsx)
                                │
                                │ 3. magic-link → session (PKCE or token_hash)
                                │ 4. POST create-subscription-checkout {mode:"checkout"}
                                ▼
                    [Stripe Checkout — iDEAL setup]
                                │
                                │ 5. setup_intent.succeeded (webhook)
                                ▼
                  [stripe-webhook] creates SubscriptionSchedule
                                │
                                │ 6. customer.subscription.created/updated
                                ▼
                       [subscriptions table]  (status: scheduled → active)
                                │
                                │ 7. monthly invoice.created → invoice.paid
                                ▼
                  [subscription_invoices table]
```

## 3. Data model

| Table | Purpose |
|---|---|
| `stripe_customers` | 1:1 link between `auth.users.id` and `stripe_customer_id`. |
| `subscriptions` | Mirror of Stripe Subscription. Contains `lesson_agreement_id`, status, period, default payment method (brand/last4), `stripe_schedule_id`. |
| `subscription_invoices` | Mirror of Stripe Invoices: amount, status, `hosted_invoice_url`, period. |
| `direct_debit_invitations` | Logs each sent invitation (timestamp, magic-link ID, agreement). |
| `accounting_settings` | Per-organisation VAT and ledger settings (account/VAT code for 21% and exempt). Used by reporting and by `pickAgeTariff` for VAT assignment. |

> ℹ️ Schedule phases are **not** mirrored in a separate DB table — they are built on every push from `_shared/billing.ts` based on the current `calculateYearlyAmount` output (including shift logic for `no_lesson_periods` and the August pause).

All tables have **PERMISSIVE, consolidated** RLS. Writes are allowed only for the service role (webhook or edge function); reads are allowed for:
- `is_privileged()` (admin/staff)
- the linked student or teacher of the `lesson_agreement`

## 4. Edge functions

| Function | Auth | Purpose |
|---|---|---|
| `send-direct-debit-invite` | JWT (admin/staff) | Generates a server-side magic link, emails it to the student, logs in `direct_debit_invitations`. |
| `create-subscription-checkout` | JWT | Creates Stripe Checkout (`mode=checkout`) or activates immediately on an existing mandate (`mode=direct`) or completes a return flow (`mode=complete`). |
| `create-customer-portal` | JWT | Opens Stripe Customer Portal for the signed-in user (or for a given `user_id` if the caller is privileged). |
| `sync-stripe-subscription` | JWT (admin/staff) | Pulls subscription status from Stripe again and writes it to the DB. |
| `rebuild-subscription-schedule` | JWT (admin/staff) | Recalculates future schedule phases with current rates (after a price change). |
| `force-start-subscription` | JWT (admin) | **Dev/test only.** Cancels the existing schedule and starts the subscription immediately. UI button is behind `import.meta.env.DEV`. |
| `stripe-webhook` | public (signature validation) | Receives and handles Stripe events. |

Shared logic lives in `supabase/functions/_shared/`:
- `billing.ts` — school year, occurrences, `calculateYearly` (including **shift logic** for `no_lesson_periods`), `pickAgeTariff`, schedule-phase builders. August stays a pure pause; other periods shift the cadence by exactly the period length.
- `stripe.ts` — Stripe client constructor (npm:stripe).
- `subscription-storage.ts` — DB upserts for `subscriptions`.
- `email-events.ts` — register of app mail events (used by `send-template-email`).
- `errors.ts` — `getSafeErrorMessage` (do not leak internal stack traces).

## 5. Magic link & email

The invitation email (`docs/email-templates/magic-link.html`) uses the custom `token_hash` format:

```
{{ .RedirectTo }}#token_hash={{ .TokenHash }}&type=email
```

Mail scanners (Outlook/SafeLinks) therefore do not consume the link in advance, because `verifyOtp` with token_hash requires an active browser session.

`DirectDebitStart` (`src/pages/DirectDebitStart.tsx`) handles two link formats via `src/lib/auth/magicLink.ts`:

1. **PKCE** — `?code=...` in the query string → `supabase.auth.exchangeCodeForSession`.
2. **Custom token_hash** — `#token_hash=...&type=email` → `supabase.auth.verifyOtp`.

The legacy implicit flow (`#access_token=...&refresh_token=...`) is **no longer** supported; the current template does not put access tokens in the hash.

## 6. Webhook events

`stripe-webhook` handles:

| Event | Effect |
|---|---|
| `checkout.session.completed` | Logs completed Checkout, links `setup_intent` to the agreement. |
| `setup_intent.succeeded` | Mandate active → creates `SubscriptionSchedule` with phases from `_shared/billing.ts`. |
| `customer.subscription.created` / `updated` | Upsert in `subscriptions` (status, period, default payment method). |
| `customer.subscription.deleted` | Status → `canceled`. |
| `invoice.created` / `finalized` / `paid` / `payment_failed` | Upsert in `subscription_invoices`. |

Signing: use **`STRIPE_WEBHOOK_SECRET`** for signature validation. Failed validation returns 401 without leaking details.

## 7. Edge cases

- **Reuse an existing mandate** — `mode: 'direct'` skips Checkout and activates the subscription on the already linked `default_payment_method`.
- **Price change** — admin clicks "Pas nieuwe tarieven toe" → `rebuild-subscription-schedule` recalculates only future phases (current phase stays so the running invoice is not touched).
- **Failed payment** — `invoice.payment_failed` sets the subscription to `past_due`. UI shows a status badge; the customer resolves it via Customer Portal.
- **Mandate revoked** — Stripe sends `payment_method.detached` / subscription becomes `unpaid`. Admin can send a new invitation.
- **Student turns 21 mid-year** — `pickAgeTariff` (see `_shared/billing.ts`) picks the rate per `lessonDate`; schedule phases fold this in per month. VAT code follows the same age logic via `accounting_settings`.
- **No-lesson period in the school year** — `calculateYearlyAmount` applies **shift logic**: lessons that fall in a period shift by exactly the period length. Lessons that then pass `periodEnd` (31 July) are dropped. See `src/lib/billing/calculateYearlyAmount.ts` and `tests/code/billing/shiftNoLessonPeriod.test.ts`.
- **August** — stays a pure skip (summer pause, no shift mutation).

## 8. Stripe dashboard checklist

1. Create **products + prices** per lesson variant (recurring `month`). Put the Stripe Price ID on the correct `lesson_agreements.stripe_price_id`.
2. Enable **payment methods**: iDEAL and SEPA Direct Debit (Settings → Payment methods).
3. Enable **Customer portal** (Settings → Billing → Customer portal). Allow at least: change payment method, view invoice history, cancel subscription.
4. Register a **webhook endpoint**:
   - URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
   - Events: `checkout.session.completed`, `setup_intent.succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.created`, `invoice.finalized`, `invoice.paid`, `invoice.payment_failed`
   - Copy the signing secret to `STRIPE_WEBHOOK_SECRET`.

## 9. Secrets

Available only in edge functions via `Deno.env.get(...)` — **never** with a `VITE_` prefix:

- `STRIPE_SECRET_KEY` — server-side Stripe key (sk_live / sk_test).
- `STRIPE_WEBHOOK_SECRET` — signing secret of the webhook endpoint.
- `SUPABASE_SERVICE_ROLE_KEY` — for writing to the DB from the webhook.

## 10. Local testing

```bash
# Forward webhooks to your local Supabase functions runtime
stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook
# (or to a remote preview branch)
stripe listen --forward-to https://<preview-ref>.supabase.co/functions/v1/stripe-webhook

# Billing unit tests (Bun, app-side — source of truth)
bun test tests/code/billing/calculateYearlyAmount.test.ts
bun test tests/code/billing/shiftNoLessonPeriod.test.ts
```

Stripe test cards / iDEAL simulator: see [Stripe testing docs](https://stripe.com/docs/testing).

## 11. Related features

- **Reporting** — `AccountingReport.tsx` + `get_hours_report()` (see `src/pages/AccountingReport.tsx` and migration `20260604113315`) give a per-teacher / per-student breakdown with VAT per lesson date. Source data: agenda + `accounting_settings`.
- **App mail templates** — all direct-debit related mail goes through `send-template-email` with events from `_shared/email-events.ts`. Templates are managed in **Settings → E-mailtemplates** (see [email-templates.md](../email-templates.md)).
- **Cancellations** — `cancellation_type` (`'student' | 'teacher'`) determines whether a cancelled lesson counts in the calculation. See memory `mem://logic/lesson-cancellation-requirements`.

## 12. Known limitations / TODO

- **Price changes Stripe → DB** are not written back to `lesson_agreements.price_per_lesson`; admin changes the rate in the app and clicks "Pas nieuwe tarieven toe".
- **`force-start-subscription`** is dev/test only (UI button behind `import.meta.env.DEV`).
