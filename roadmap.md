# Roadmap

## Fase 1 — tariefmodel (klaar)
## Fase 2 — Stripe-catalogus (klaar)

## Fase 3a — tarieventabel + abonnementen op catalogus
- [ ] Seed exact volgens tarievenlijst + opruimblok + seed-controletest
- [ ] E-mailtemplates: prijs per les → bedrag
- [ ] Migratie: subscriptions-kolommen, portal-config, agreement_fee_months, needs_rebuild-triggers, kolommen weg, template-update
- [ ] Pure subscriptionPlan + tests (instroom, augustus, 21+, tariefwijziging, opzegging)
- [ ] Schedule-opbouw, checkout/force-start/rebuild/portal/invite/webhook aanpassen
- [ ] check-stripe-subscriptions + kaart
- [ ] stripe-billing-daily + cron lovable-branch
- [ ] Wizard: Stripe standaard, SEPA niet kiesbaar voor nieuw
- [ ] Opruimen oude fasenlogica en price_per_lesson
- [ ] Docs, handleiding, CHANGELOG, AGENTS.md; check + check:ci

## Later
- Fase 3b (facturen op factuur), 4, 5
