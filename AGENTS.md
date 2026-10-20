# AGENTS.md

Technical decisions (one rule each, with why).

- Lesson-fee rules (tariffs, age category, proration, term, VAT split) live only in SQL (`compute_lesson_fee` and wrappers); the frontend previews via RPC and invoices copy the VAT split from batch items — one source, no TS duplicate to keep in sync.
- The Stripe catalog (products/prices/tax rates) is derived from app tariffs by `sync-stripe-catalog` with deterministic lookup keys; never edited in Stripe — the app is the single price source and syncs must be idempotent.
