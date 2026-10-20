# Fase 3a — tarieventabel exact + Stripe-abonnementen op de catalogus

Niets nieuws op SEPA. De facturen voor "op factuur" volgen in fase 3b.

## Deel A — tarieventabel exact volgens de lijst

**`supabase/seeds/bootstrap.sql`** (blijft idempotent):
- **Instrumentlessen** (Gitaar, Drum, Zang, Bas, Keyboard, Saxofoon): de seed maakt alleen nog de lesvormen **30 min wekelijks** (€ 73,38 / € 88,79) en **30 min tweewekelijks** (€ 38,67 / € 46,79) aan.
- **Opruimblok** voor databases waar de oude testdata al in staat:
  - alle tariefrijen per 1 september 2026 die niet op de lijst staan, worden verwijderd;
  - overige lesvormen blijven bestaan zonder tarief, met status "Ontbreekt: geen tarief" in Stripe. Verwijderen kan niet zonder overeenkomsten te raken; zonder tarief worden ze ook niet kiesbaar voor Stripe (zie wizard).
- **Duo:** 30 min wekelijks € 51,56 / € 62,39 en 30 min tweewekelijks € 26,79 / € 32,41.
- **Popkids en Popkoor** (aanname: 60 min wekelijks): De Popkids € 24,55; Popkoor 12-18 € 30,00; Popkoor 18+ € 30,00 / € 36,31.
- **Bandcoaching:** € 16,91 / € 20,46, alleen op **60 min tweewekelijks**. Die lesvorm gebruiken de testovereenkomsten en de groep "Bandcoaching maandag".
- **Groepslessen** (eenmalig): Klank en Kriebels, Notenkrakers, Mini Maestro's en De Muziekclub 45 min; DJ-School en Laatbloeiers 60 min (bedragen zoals de lijst).
- **DJ / Beats** staat niet op de lijst en krijgt geen tarief. In `test.sql` gaan de DJ / Beats-overeenkomsten naar "Handmatig / op factuur".
- **Ingangsdatum** overal 1 september 2026.
- **E-mailtemplates:** de variabele `prijs_per_les` wordt `bedrag`, bijv. "€ 73,38 per maand" of "€ 66,00 eenmalig". Dit geldt voor `agreement_created`, `agreement_created_teacher` en `signup_received`. De tekst wordt bijgewerkt in de seed, in `src/lib/email/events.ts` en met een migratie-UPDATE op de bestaande rijen.
  - Het bedrag komt bij overeenkomstmails uit `preview_lesson_fee`.
  - In de aanmeldmail (geen geboortedatum bekend) komt "€ 73,38 per maand (21+: € 88,79)".
  - Ook de duo-bevestiging gaat over.

## Deel B — abonnementen op de catalogus

### Kernkeuze: Subscription Schedule per overeenkomst + dagelijkse taak

Per overeenkomst één schedule met fasen die altijd op de 1e van de maand beginnen, gebouwd uit `compute_agreement_month_fee` per maand:
- Opeenvolgende maanden met dezelfde catalogusprijs worden samengevoegd tot één fase (prijs + btw-tarief, `proration_behavior: none`).
- **Augustus** is een fase met `trial: true`: er komt een factuur van € 0, er wordt niets afgeschreven, elk jaar automatisch.
- **21+-overstap en tariefwijziging** zijn gewoon een nieuwe fase per die maand.
- **Horizon:** tot 15 maanden vooruit (meestal 3 tot 5 fasen, ruim onder de Stripe-grens van 10). Een dagelijkse taak verlengt de horizon en bouwt de schedule opnieuw op als de bron is gewijzigd.
- **Einde:** bij een opzegging eindigt de laatste fase op de 1e van de maand na de opzegdatum, met `end_behavior: cancel`. Zonder opzegging blijft de schedule altijd verlengd.
- **Veiligheid:** de horizon loopt altijd tot na de volgende augustus. Valt de taak een tijd uit, dan draait het abonnement dus niet onbedoeld in augustus door.

**Alternatieven en waarom niet:**
- `pause_collection`: dat vereist een taak precies op 1 augustus en 1 september, en de facturen worden daarbij vernietigd (void) in plaats van € 0.
- Alleen een dagelijkse taak die prijzen wisselt: één gemiste dag geeft meteen een verkeerd bedrag.
- De gekozen schedules leggen de toekomst vast in Stripe; de taak houdt die alleen bij.

### Aanpak per eis

1. **Bedrag gelijk aan de bron.** Elke fase gebruikt de catalogusprijs waarvan `lookup_key` (fase 2) overeenkomt met lesvorm, ingangsdatum, leeftijdscategorie en bedrag uit `compute_agreement_month_fee`. Wijkt het bedrag af of ontbreekt de prijs, dan wordt er niets opgebouwd en volgt een duidelijke fout.
   - **Eerste deelmaand:** een losse eenmalige factuur (invoice item met `price_data` op het catalogusproduct, inclusief btw, met het btw-tarief) voor exact het bedrag naar rato. Die factuur gaat uit op de startdatum, of direct als die al voorbij is.
   - De schedule start op de 1e van de volgende maand. Start iemand op de 1e, dan is er geen losse factuur. Zo rekent Stripe nooit zelf naar rato.
2. **Btw per regel:** per fase `default_tax_rates`: het 21%-tarief voor 21+-prijzen, het vrijgestelde tarief voor prijzen onder 21 (ids uit `accounting_settings`).
3. **Augustus:** trial-fase (zie boven).
4. **21+-overstap:** volgt automatisch uit `compute_agreement_month_fee` (andere prijs en ander btw-tarief per die maand).
5. **Tariefwijziging:** een trigger op tarieven zet `needs_rebuild` op lopende abonnementen van die lesvorm. Na de catalogussync en in de dagelijkse taak wordt dan opnieuw opgebouwd.
6. **Opzeggen:**
   - Na `cancel_lesson_agreement` roept de knop "Opzeggen" direct `rebuild-subscription-schedule` aan; de schedule eindigt dan met `end_behavior: cancel`.
   - Het klantportaal krijgt een eigen configuratie, één keer automatisch via de API aangemaakt in `sync-stripe-catalog`. Daarin staan betaalmethode wijzigen en facturen bekijken aan, en opzeggen en wijzigen uit.
   - `create-customer-portal` geeft die configuratie mee.
7. **Groepslessen (`one_off`):** `send-direct-debit-invite`, `create-subscription-checkout` en het opbouwen van de schedule weigeren die (409, "Eenmalig betalen via Stripe volgt later").
8. **Controle:** de nieuwe functie `check-stripe-subscriptions` vergelijkt per actieve Stripe-overeenkomst de voorvertoning van de volgende factuur (`invoices.createPreview`) met `compute_agreement_month_fee` voor die maand.
   - De kaart "Controleer abonnementen" staat onder Boekhouding-instellingen, met een tabel: leerling, maand, Stripe-bedrag, verwacht bedrag, verschil.
9. **Bestaande flow blijft:** betaaluitnodiging → iDEAL-machtiging → bij voltooien de schedule en eventueel de eerste deelfactuur. De webhook blijft abonnementen en facturen bijwerken. Daarbij komen:
   - `subscription_schedule.released`, `.canceled` en `.completed`;
   - `invoice.payment_failed` zet de status op achterstallig;
   - een melding als de schedule onverwacht vrijgegeven wordt.
10. **Wizard:**
    - Stripe is standaard.
    - SEPA is alleen nog zichtbaar bij bestaande SEPA-overeenkomsten.
    - Bij Stripe zijn alleen lesvormen met een tarief kiesbaar.
11. **Opruimen:**
    - Uit `_shared/billingPure.ts` verdwijnen `buildPhases`, `calculateYearly`, `getOccurrenceDates`, `clampToSchoolYear`, `pickPriceCentsForTariff` en dergelijke.
    - Uit `_shared/billing.ts` verdwijnen `createScheduleForAgreement`/`rebuildScheduleForAgreement` en de prijzen per overeenkomst.
    - `rebuild-subscription-schedule` houdt dezelfde naam (de knop "Pas nieuwe tarieven toe" blijft), met de nieuwe opbouw. `force-start-subscription` (alleen in ontwikkelmodus) gebruikt dezelfde opbouw.
    - Kolommen die verdwijnen: `price_per_lesson` op `lesson_agreements` en `lesson_groups`, `price_per_lesson*` op `lesson_type_options`, en `stripe_price_id`/`stripe_schedule_id` op `lesson_agreements` (de schedule staat al op `subscriptions`).
    - Alle verwijzingen in de frontend (circa 25 bestanden), legacy-import en duo-functies gaan mee. De urenrapportage gebruikt geen prijzen.

## Datamodel (één migratie)

- **`subscriptions`:**
  - `needs_rebuild` boolean, `schedule_horizon_end` date en `last_rebuilt_at`;
  - `first_invoice_stripe_id` en `first_invoice_status`;
  - `last_check_at`, `last_check_expected_cents`, `last_check_stripe_cents`.
- **`accounting_settings`:** `stripe_portal_configuration_id`.
- **SQL-functie `agreement_fee_months(agreement_id, from_month, months)`** (SECURITY DEFINER, alleen service_role): per maand bedrag, leeftijdscategorie, `tariff_effective_from` en `is_prorated`, via `compute_agreement_month_fee`. Er wordt niets nieuw gerekend.
- **Triggers die `needs_rebuild` zetten:** bij wijziging van een tarief, bij wijziging van een overeenkomst (lesvorm, start, einde, opzegging) en bij wijziging van `students.date_of_birth`.
- De kolommen uit eis 11 worden verwijderd.
- **Migratie-UPDATE** op `email_templates` (prijs per les wordt bedrag).

## Edge functions en planning

- **Nieuw `_shared/subscriptionPlan.ts` (puur):** maanden naar fasen (samenvoegen, augustus als trial, einde bij opzegging, horizon), lookup-sleutel per maand, btw-tarief per fase, eerste deelmaand, en vergelijking van voorvertoning met het verwachte bedrag.
- **Nieuw `_shared/subscriptionSchedule.ts`:** schedule aanmaken of bijwerken; bij een actieve schedule alleen fasen vanaf de huidige fase vervangen.
- **Aangepast:** `create-subscription-checkout`, `force-start-subscription`, `rebuild-subscription-schedule`, `create-customer-portal`, `send-direct-debit-invite`, `stripe-webhook`, `sync-stripe-catalog` (portaalconfiguratie en daarna `needs_rebuild` verwerken).
- **Nieuw `check-stripe-subscriptions`** (admin).
- **Nieuw `stripe-billing-daily`:** eerste deelfacturen op de startdatum, horizon verlengen en `needs_rebuild` verwerken. Beveiligd met de secret `CRON_SECRET` in een header.
- **Planning:** pg_cron + pg_net, dagelijks om 03:00. Die SQL bevat de projectspecifieke URL en sleutel en hoort daarom niet in een migratie: ik voer hem eenmalig uit op de lovable-branch en documenteer hem in `docs/integrations/stripe-abonnementen.md`, zodat jullie hem op productie kunnen herhalen.

## Tests (puur, geen Stripe-aanroepen)

- `subscriptionPlan.test.ts`:
  - instroom 15 oktober: deelfactuur 17/31 van het maandbedrag (bedrag uit de fee-tabel), schedule vanaf 1 november;
  - start op de 1e: geen deelfactuur;
  - augustus is een trial-fase van € 0, twee jaar achter elkaar;
  - 21e verjaardag 10 maart: nieuwe fase per 1 april met de 21+-prijs en het 21%-btw-tarief;
  - tariefwijziging 1 september: nieuwe fase met de nieuwe lookup-sleutel;
  - opzegging per 30 april: laatste fase eindigt op 1 mei, `end_behavior: cancel`;
  - samenvoegen van gelijke maanden; maximaal 10 fasen;
  - ontbrekende catalogusprijs of afwijkend bedrag geeft een fout;
  - groepsles geeft een weigering.
- `subscriptionCheck.test.ts`: verschil gelijk, hoger, lager, en augustus (verwacht € 0).
- **PGlite:** `agreement_fee_months` op het pure blok (augustus 0, deelmaand).
- **Seed-controle:** een test die `bootstrap.sql` leest en de exacte bedragen per lesvorm vergelijkt met de lijst.
- **Bijwerken of verwijderen:** bestaande tests voor `billingPure`, wizard (standaard Stripe) en e-mailvariabelen.

## Wat verdwijnt

Fasen per schoolsjaar met 11 prijzen per overeenkomst, `calculateYearly`, `end_behavior: release`, prijs per les in de app, e-mails en kolommen, en SEPA als keuze voor nieuwe overeenkomsten.

## Open vragen (aanname tussen haakjes)

1. Popkids en Popkoor 60 min, groepslessen 45/60 min? (ja, zoals nu in de seed)
2. DJ / Beats zonder tarief en testovereenkomsten naar "op factuur"? (ja)
3. De eerste deelmaand op de startdatum factureren, en niet bij de eerste maandfactuur? (ja, op de startdatum)
4. Mag ik de dagelijkse taak zelf inplannen op de lovable-branch? (ja, en jullie herhalen hem op productie)
5. Een €-0-factuur in augustus is zichtbaar voor de leerling. Akkoord? (ja; het alternatief is void-facturen via `pause_collection`)

## Zelf doen (na uitvoering)

1. `bun run db:reset`.
2. Secret `CRON_SECRET` toevoegen.
3. In het Stripe Dashboard (testmodus) de webhook-events uitbreiden met `subscription_schedule.*` en `invoice.payment_failed`.
4. Een keer "Synchroniseer met Stripe" draaien (dat maakt ook de portaalconfiguratie aan).
5. De cron-SQL op productie draaien.
