# Roadmap

## Fase 1 — tariefmodel (klaar)
## Fase 2 — Stripe-catalogus (klaar)

## Fase 3a — tarieventabel + abonnementen op catalogus (klaar)
- [x] Seed exact volgens tarievenlijst + opruimblok + seed-controletest
- [x] E-mailtemplates: prijs per les → bedrag
- [x] Migratie: subscriptions-kolommen, portal-config, agreement_fee_months, needs_rebuild-triggers, kolommen weg, template-update
- [x] Pure subscriptionPlan + tests (instroom, augustus, 21+, tariefwijziging, opzegging)
- [x] Schedule-opbouw, checkout/force-start/rebuild/portal/invite/webhook aanpassen
- [x] check-stripe-subscriptions + kaart
- [x] stripe-billing-daily + cron lovable-branch
- [x] Wizard: Stripe standaard, SEPA niet kiesbaar voor nieuw
- [x] Opruimen oude fasenlogica en price_per_lesson
- [x] Docs, handleiding, CHANGELOG, AGENTS.md; check + check:ci

## Later
- Fase 3b (facturen op factuur), 4, 5

## Mijn facturen — Stripe
- [x] Stripe-facturen naast eigen facturen, met openen/downloaden; gerichte tests en documentatie
- Klantcontrole met echte sessie niet beschikbaar: externe Supabase zonder beheerde browsersessie; controleer de testfactuur na inloggen.
