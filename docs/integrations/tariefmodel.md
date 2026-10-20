# Tariefmodel — maandbedrag per lesvorm (fase 1)

Besluit 20 oktober 2026. Geldt voor alle betaalmethodes (SEPA-incasso, Stripe, handmatig/op factuur).
Stripe-catalogus en -abonnementen volgen in fase 2 en 3; die gebruiken dezelfde rekenregels.

## Regels

| Regel | Uitwerking |
|---|---|
| Bedrag | Vast maandbedrag per lesvorm (lessoort + duur + frequentie + optioneel label), niet uit het aantal lessen |
| Termijnen | 11 per schooljaar; **augustus = 0** |
| Leeftijd | Bedrag onder 21 (btw-vrijgesteld) en 21+ (inclusief 21% btw, exact het bedrag van de tarievenlijst) |
| 21+-ingang | 1e van de maand **na** de 21e verjaardag |
| Alleen 21+-tarief | Leerling onder de 21 betaalt het 21+-bedrag (bijv. Laatbloeiers) |
| Geen 21+-tarief | `has_adult_tariff = false`: iedereen betaalt het bedrag onder 21 (bijv. Popkids) |
| Geboortedatum | Verplicht bij SEPA en Stripe (en duo). Ontbreekt die, dan geeft de berekening een fout; nooit stilzwijgend 21+ |
| Instroom | Eerste maand naar rato op kalenderdagen, startdag inbegrepen |
| Tariefwijziging | Nieuw tarief met ingangsdatum; geldt automatisch voor lopende overeenkomsten vanaf die maand |
| Groepslessen | `billing_kind = 'one_off'`: eenmalig bedrag in de maand van de startdatum (SEPA: batch van de startmaand) |
| Duo | Tarief per persoon; elke duo-leerling een eigen overeenkomst en eigen leeftijdscategorie |
| Looptijd | Eerste verbintenis 6 kalendermaanden (`minimum_term_end` = start + 6 maanden − 1 dag); daarna per schooljaar tot 31 juli, stilzwijgend verlengd |
| Opzeggen | Niet maandelijks. Gaat in per einde van de lopende periode; opzegtermijn (dagen) in Boekhouding-instellingen |
| Btw-uitsplitsing | 21+: excl. = round(bedrag / 1,21), btw = bedrag − excl.; onder 21: btw 0 |

## Eén bron: de database

De rekenregels staan **alleen** in SQL (migratie `20261020145053_tariefmodel_maandbedragen_per_lesvorm.sql`,
blok tussen `-- BEGIN PURE TARIFF FUNCTIONS` en `-- END PURE TARIFF FUNCTIONS`):

- `compute_lesson_fee(billing_kind, has_adult_tariff, tariffs jsonb, date_of_birth, start_date, end_date, month)` — pure functie, alle regels.
- `compute_minimum_term_end(start_date)` en `compute_cancellation_effective_date(minimum_term_end, requested_on, notice_days)`.
- `preview_lesson_fee(option_id, dob, start, end, month)` — RPC voor de wizard vóór opslaan (ingelogd).
- `compute_agreement_month_fee(agreement_id, month)` — voor een opgeslagen overeenkomst (alleen server).
- `build_direct_debit_batch_items(batch_id)` — vult per regel bedrag, leeftijdscategorie, btw-percentage, bedrag excl. en btw.
- `cancel_lesson_agreement(agreement_id)` — zet opzegdatum en einddatum (beheer/medewerker).
- `set_student_date_of_birth_if_missing(student, dob)` — wizard vult een ontbrekende geboortedatum in; overschrijft nooit.

`generate-invoice` rekent niet zelf: het neemt de btw-uitsplitsing van elke incassoregel over en weigert regels zonder die gegevens.
Er is dus geen TypeScript-kopie van de regels en geen pariteitstest nodig.

**Tests:** `tests/code/billing/lessonFeeRules.test.ts` laadt het pure SQL-blok uit de migratie in PGlite
(Postgres in het testproces) en test de regels rechtstreeks; draait mee met `bun test code`.

## Datamodel

- `lesson_type_options`: `label`, `billing_kind` (`monthly` | `one_off`), `has_adult_tariff`. `price_per_lesson*` zijn vervallen als bron (nullable; verwijderen in fase 3).
- `lesson_type_option_tariffs`: per lesvorm en `effective_from` een `amount_under_21_cents` en `amount_adult_cents` (uniek per datum, historie blijft).
- `lesson_agreements`: `lesson_type_option_id` (automatisch gekoppeld op duur/frequentie als die leeg is), `minimum_term_end`, `cancellation_requested_at`, `cancellation_effective_date`. `monthly_amount_cents` is verwijderd; `price_per_lesson` wordt niet meer gevuld.
- `direct_debit_batch_items`: `age_category`, `btw_rate`, `amount_excl_btw_cents`, `btw_amount_cents`.
- `accounting_settings.cancellation_notice_days` (standaard 30).
- De urenrapportage gebruikt geen prijzen en blijft werken.

## Toegang

- Tarieven lezen: ingelogde gebruikers; wijzigen: admin/site_admin.
- `preview_lesson_fee`: ingelogd (security invoker; RLS bepaalt wat zichtbaar is).
- Functies met `SECURITY DEFINER` die ingelogde gebruikers mogen aanroepen (`cancel_lesson_agreement`, `set_student_date_of_birth_if_missing`, `build_direct_debit_batch_items`) controleren zelf de rol. Dat is bewust; de linter-waarschuwing hierover hoort bij dit patroon.

## Testdata

`supabase/seeds/bootstrap.sql` bevat de tarievenlijst per 1 september 2026 (privé, duo, Popkids, Popkoor, Bandcoaching en de groepslessen).
Instrumentlessen van 30 minuten gebruiken de privétarieven; andere duur is fictief (naar rato van de duur).
`supabase/seeds/test.sql` geeft leerlingen met SEPA/Stripe een geboortedatum.

## Zelf doen

1. `bun run db:reset` (reset + types).
2. Controleer de tarieven onder Lessoorten en vul ontbrekende lesvormen in.
3. Stel de opzegtermijn in onder Instellingen → Boekhouding.
