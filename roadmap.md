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

## Dubbele Stripe-schema's (klaar)
- [x] Atomaire claim per overeenkomst (claim_schedule_build) + unieke index op open abonnementen
- [x] Idempotency keys op subscriptionSchedules.create; adoptie van bestaand open schema
- [x] Dubbel-detectie in "Controleer abonnementen" en dagelijkse taak; knop "Herstel dubbele abonnementen"
- Klantcontrole met echte sessie niet beschikbaar: externe Supabase zonder beheerde browsersessie; controleer de testfactuur na inloggen.

## Overeenkomst en betaalverzoek in één stap (plan 21-10-2026)
- [x] Stap 1: inhaalfactuur (catchUpInvoicePure + subscriptionSchedule) met tests
- [x] Stap 2: agreement_payment_links + vaste link, preview via serverfunctie, token-route naar iDEAL, "nieuwe link aanvragen" (view wacht op machtiging volgt in stap 4)
- [ ] Stap 3: één mail bij opslaan (betaalblok in agreement_created, ontvanger ouder/account), ook duo en aanmelding; "Opnieuw versturen"; aanmeldformulier zonder SEPA met fonds → op factuur
- [ ] Stap 4: status "Wacht op machtiging", beheeroverzicht, melding leerlingportaal
- [ ] Docs, handleiding; check + check:ci
