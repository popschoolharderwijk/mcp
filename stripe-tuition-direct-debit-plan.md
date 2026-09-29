# Plan: Stripe tuition direct debit (v2) — HISTORICAL DOCUMENT

> 📌 **This is a historical planning document (12 May 2026).** It describes the original approach and contains outdated details. For the current technical description of the Stripe direct-debit flow, see:
>
> **→ [docs/integrations/stripe-direct-debit.md](docs/integrations/stripe-direct-debit.md)**
>
> Main differences versus the current implementation:
>
> - **No-lesson periods**: the plan assumed "skip" (lessons dropped); the current implementation uses **shift logic** (`src/lib/billing/calculateYearlyAmount.ts`) — lessons shift by the length of the period. August still skips.
> - **`subscription_schedule_phases` table**: never created; schedule phases are built directly from `_shared/billing.ts` and not mirrored separately.
> - **Webhook trigger**: the schedule is created on `setup_intent.succeeded` (not `checkout.session.completed`).
> - **Extra edge functions added**: `create-customer-portal`, `sync-stripe-subscription`, `rebuild-subscription-schedule`, `force-start-subscription`, `send-template-email`, `send-direct-debit-invite`.
> - **Extra tables added**: `incasso_invitations`, `accounting_settings`, `email_templates`.

---

_The content below is kept for historical context. Do not change it — update `docs/integrations/stripe-direct-debit.md` instead._

## Goal

Monthly SEPA collection of tuition via Stripe, spread over **11 months per year** (skip August), based on a price per lesson and the student's lesson frequency.

## Core design (original plan)

### Prices per lesson

Stored on `lesson_type_options`, extended with two age tariffs (<21 and 21+). ✅ Implemented.

### School year

1 September → 31 July (11 collection months, August pause). ✅ Implemented.

### Yearly amount calculation

- `yearlyCents = lessonsCount × pricePerLessonCents`
- `monthlyCents = floor(yearlyCents / 11)` with remainder in the last month

Implementation differs: uses **shift logic** for `no_lesson_periods` instead of a simple skip.

### Stripe Subscription Schedule

11 phases per year (Sep through Jul), August pause. ✅ Implemented in `_shared/billing.ts`.

### Decisions (original, still valid)

- ✅ Skip August via Schedule phases
- ✅ Both flows: Checkout and activate immediately on an existing mandate
- ✅ Price changes: from the next collection month, no proration
- ✅ Age determination per `lessonDate` (differs from original: not per phase start date)
- ✅ School year: 1 September – 31 July
