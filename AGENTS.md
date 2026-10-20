
- Lesson-fee rules (tariffs, age category, proration, term, VAT split) live only in SQL (`compute_lesson_fee` and wrappers); the frontend previews via RPC and invoices copy the VAT split from batch items — one source, no TS duplicate to keep in sync.
