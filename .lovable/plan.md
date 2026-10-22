# Diagnose mcp-dev — rapport (alleen-lezen, niets gewijzigd)

## 1. Welk project
- Database-tools draaien op **mcp-dev `zdvscmogkfyddnnxzkdu`**. Bewijs: de cronjob die ik gisteren via de migratietool plaatste staat in deze database en roept `https://zdvscmogkfyddnnxzkdu.supabase.co/functions/v1/stripe-billing-daily` aan; `.env` en `.env.development` wijzen naar dezelfde URL.
- Edge functions gaan naar hetzelfde project (de Lovable-koppeling heeft één project: ref `zdvscmogkfyddnnxzkdu`).

## 2. Migratiehistorie
26 rijen. Nieuwste: 4 van vandaag (`20261022072321` cron + drie `SELECT 1`-records `073013/073055/073145`, leeg, van de migratietool), daarna direct `20260622162957_invoices`. Er staan **geen** migraties van 13–21 oktober in.

Ontbrekend, op volgorde (14):
1. `20260605071549_legacy_ids`
2. `20261013115528_blokkeer_stripe_overeenkomsten_in_incassobatch`
3. `20261020145053_tariefmodel_maandbedragen_per_lesvorm`
4. `20261020150658_5d3640d7-…`
5. `20261020152359_stripe_catalogus_lesvormen`
6. `20261020152412_stripe_catalogus_anon_intrekken`
7. `20261020154115_stripe_abonnementen_op_catalogus`
8. `20261020174318_mailtemplate_betaaluitnodiging`
9. `20261021070650_0dcde8ca-…`
10. `20261021070704_133aa16f-…`
11. `20261021082624_vaste_betaallink_per_overeenkomst`
12. `20261021082635_rechten_betaallink_tabellen_alleen_server`
13. `20261021085340_bevestigingsmail_en_betaalkeuze_aanmelding`
14. `20261021093117_…`, `20261021093128_…`, `20261021093722_herstel_klant_id_type_schedule_claim`

(`20261022072321` cron staat er wél.) Ook `legacy_ids` mist: geen enkele `legacy`-kolom aanwezig.

## 3. Objecten
Alles **ontbreekt**: `lesson_type_option_tariffs`, `stripe_catalog_products`, `agreement_payment_links`, `payment_link_requests`, view `agreements_awaiting_mandate`, functie `claim_schedule_build`, `lesson_signup_requests.payment_method`, `subscriptions.first_invoice_status`, `lesson_type_options.label`, elke `billing_kind`-kolom.

## 4. Aantallen
lesson_agreements 1.466 · students 1.162 · profiles 1.232 (88 `@test.nl`) · lesson_types 70 · lesson_type_options 189 · tarieven: tabel bestaat niet · subscriptions 0.

**Alle profielen en overeenkomsten zijn aangemaakt op 21 oktober 2026 rond 16:22 UTC.** De database is dus gisteren ~16:22 gereset (seed + legacy-import erbovenop), vanaf een codestand die alleen migraties t/m 22 juni kende — vermoedelijk `main` of een lokale checkout zonder de `lovable`-commits. Mijn wijzigingen van eerder die dag (tarieven, view, claim-fix) zijn daarbij gewist. Mijn eerdere uitspraak dat stap 4 "op mcp-dev staat" klopte op het moment zelf, maar niet meer na die reset.

## 5. Advies (niet uitgevoerd)
**Optie A — alleen ontbrekende migraties in volgorde toepassen (aanbevolen als je de testdata wilt houden).**
- Draai lokaal op de `lovable`-checkout `supabase link --project-ref zdvscmogkfyddnnxzkdu` en `supabase db push --linked --include-all` (nodig omdat `legacy_ids` ouder is dan de laatst toegepaste versie). Daarna `bun run supabase:types`.
- Risico's:
  - `tariefmodel…` dropt `lesson_agreements.monthly_amount_cents`; `stripe_abonnementen_op_catalogus` dropt `lesson_agreements.price_per_lesson/stripe_price_id/stripe_schedule_id`, `lesson_groups.price_per_lesson` en de drie prijs-kolommen op `lesson_type_options`. Bij testdata acceptabel (bedragen komen voortaan uit tarieven), maar ze zijn weg.
  - `legacy_ids` kan botsen met de net geïmporteerde data (bijv. unieke index op leeg/dubbel legacy-id) — eerst het bestand doorlezen.
  - Datamigraties die uitgaan van data van vóór de import (bijv. billing_kind-afleiding, standaard-mailtemplates) kunnen andere uitkomsten geven; de 24 tarieven moeten daarna opnieuw ingevoerd worden (idempotent vulscript uit `bootstrap.sql`) en Stripe-catalogus opnieuw synchroniseren.
  - De drie lege `SELECT 1`-records van vandaag staan niet in de repo; `db push` kan daarover klagen. Oplossing: `supabase migration repair --status reverted 20261022073013 20261022073055 20261022073145`.
- Via mijn migratietool kan het ook (14 migraties één voor één), maar dat maakt nieuwe versienummers en dus een afwijkende historie t.o.v. de repo — af te raden.

**Optie B — `bun run db:reset` vanaf de `lovable`-checkout.** Schoonste resultaat (historie = repo, tarieven uit `bootstrap.sql` direct aanwezig), maar wist alle testdata incl. de 1.466 geïmporteerde overeenkomsten; legacy-import daarna opnieuw draaien. Kies dit als de testdata makkelijk opnieuw te importeren is.

**Voorkomen:** reset alleen vanaf een checkout van `lovable` (of na merge naar `main`); controleer vooraf met `supabase migration list --linked`.

Na goedkeuring wijzig ik niets; geef aan welke optie je kiest of laat het uitvoeren aan jezelf.
