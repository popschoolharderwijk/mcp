# Roadmap

## Fase 1 — tariefmodel (bezig)
- [x] Migratie tarieven, looptijd, opzegtermijn, btw per incassoregel, rekenregels in SQL
- [x] Tests rekenregels (PGlite) — 14 gevallen
- [ ] Beheer lesvormen: maandbedrag, eenmalig, 21+-vlag, ingangsdatum
- [ ] Wizard: lesvorm-id, geen prijs per les, geboortedatum verplicht bij SEPA/Stripe, voorvertoning via RPC
- [ ] Overeenkomst opzeggen (knop) + opzegtermijn in Boekhouding-instellingen
- [ ] generate-invoice neemt btw over van incassoregel
- [ ] Seeds met tarievenlijst
- [ ] Docs (docs/integrations/tariefmodel.md), handleiding, CHANGELOG, AGENTS.md
- [ ] bun run check / check:ci groen

## Later
- Fase 2–5 (Stripe-catalogus, abonnementen, groepslessen via Stripe, migratie mandaten)
