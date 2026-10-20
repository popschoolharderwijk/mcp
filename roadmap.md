# Roadmap

## Fase 1 — tariefmodel (klaar)
- [x] Migratie tarieven, looptijd, opzegtermijn, btw per incassoregel, rekenregels in SQL
- [x] Tests rekenregels (PGlite) — 14 gevallen
- [x] Beheer lesvormen: maandbedrag, eenmalig, 21+-vlag, ingangsdatum
- [x] Wizard: lesvorm-id, geen prijs per les, geboortedatum verplicht bij SEPA/Stripe, voorvertoning via RPC
- [x] Overeenkomst opzeggen (knop) + opzegtermijn in Boekhouding-instellingen
- [x] generate-invoice neemt btw over van incassoregel
- [x] Seeds met tarievenlijst
- [x] Docs (docs/integrations/tariefmodel.md), handleiding, CHANGELOG, AGENTS.md
- [x] bun run check / check:ci groen

## Later
- Fase 2–5 (Stripe-catalogus, abonnementen, groepslessen via Stripe, migratie mandaten)
