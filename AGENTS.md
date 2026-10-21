# AGENTS.md

Technical decisions (one rule each, with why).

- Lesson-fee rules (tariffs, age category, proration, term, VAT split) live only in SQL (`compute_lesson_fee` and wrappers); the frontend previews via RPC and invoices copy the VAT split from batch items — one source, no TS duplicate to keep in sync.
- Stripe subscriptions are one schedule per agreement on catalog prices, rebuilt from `agreement_fee_months` (flagged by DB triggers, run by `stripe-billing-daily`); the first month is a separate invoice — Stripe never prorates, so amounts always equal the SQL source.
- The Stripe catalog (products/prices/tax rates) is derived from app tariffs by `sync-stripe-catalog` with deterministic lookup keys; never edited in Stripe — the app is the single price source and syncs must be idempotent.
- Agreement customer confirmations use one shared server sender with SQL payment previews and existing fixed-token helpers; wizard, duo and signup invoke it only for new agreements to prevent duplicate customer mail.
- Signup payment choice is stored on the request and copied to its agreement; old bank columns are ignored by new submissions to avoid creating new native SEPA mandates.
- My invoices normalizes school invoices and webhook-stored Stripe invoices into display rows using the authenticated client and existing RLS; Stripe links stay separate from school PDF signing to avoid duplicate invoice generation.
