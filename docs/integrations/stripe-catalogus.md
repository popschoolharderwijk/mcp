# Stripe-catalogus — lesvormen en tarieven automatisch in Stripe (fase 2)

Besluit 20 oktober 2026. De app is de bron. In Stripe beheert niemand prijzen met de hand.
Abonnementen gebruiken de catalogus pas vanaf fase 3. Tot die tijd blijven `_shared/billing*.ts`, `create-subscription-checkout`, `stripe-webhook` en de schedules ongewijzigd.

## Wat er in Stripe komt

| App | Stripe |
|---|---|
| Lesvorm (`lesson_type_options`) | Eén **product**, naam bijv. "Gitaar · 30 min · wekelijks" of "Klank en Kriebels · eenmalig" (+ label). Metadata `lesson_type_option_id` |
| Tarief (`lesson_type_option_tariffs`) per ingangsdatum | Per gevuld bedrag een **prijs**: jonger dan 21 en/of 21+ |
| `billing_kind = monthly` | Prijs recurring, per maand |
| `billing_kind = one_off` (groepslessen) | Eenmalige prijs |
| Lesvorm zonder tarief | **Geen product**. Status "Ontbreekt: geen tarief" |
| Lessoort uitgezet / lesvorm verwijderd | Product en prijzen **gearchiveerd** (`active: false`), nooit verwijderd |
| Verlopen tarief (er geldt een nieuwer tarief) | Prijs gearchiveerd. Lopende abonnementen blijven werken |
| Toekomstig tarief | Prijs staat al klaar (actief) |

Alle prijzen hebben `currency: eur` en `tax_behavior: inclusive`. Het bedrag is exact het bedrag uit de tarievenlijst (bijv. € 88,79).

## Btw

- De sync maakt **eenmalig automatisch** twee Stripe-btw-tarieven aan en bewaart de id's in `accounting_settings`:
  - "Btw 21%": 21%, inclusief, NL (`stripe_tax_rate_21_id`)
  - "Btw vrijgesteld": 0%, inclusief (`stripe_tax_rate_exempt_id`)
- Stripe kan een btw-tarief niet aan een prijs koppelen. In **fase 3** komt het tarief daarom op de abonnementsregel (`subscription_items[].tax_rates`). Welk tarief erbij hoort, staat in de metadata van elke prijs: `tax_rate_key = nl_21_incl | exempt`.
- Omdat de prijs inclusief is, blijft het eindbedrag gelijk. De factuur toont "Btw 21% (inbegrepen)" of "Btw vrijgesteld 0%".
- Stripe Tax (automatische btw) staat bewust uit.

## Idempotentie

- **Product:** eerst het opgeslagen `stripe_product_id`, anders `products.search` op `metadata['lesson_type_option_id']`, anders aanmaken met idempotency-key `mcp_product_<optionId>`.
- **Prijs:** deterministische `lookup_key` `mcp_opt_<optionId>_<ingangsdatum>_<u21|adult>_<bedragInCenten>`, die ook als idempotency-key dient. Bestaat die sleutel al (ook gearchiveerd), dan wordt de prijs gebruikt of gereactiveerd en nooit opnieuw aangemaakt.
- Stripe-prijzen zijn niet wijzigbaar. Een ander bedrag geeft dus een nieuwe sleutel en een nieuwe prijs, en de oude prijs wordt gearchiveerd.
- **Vergelijken:** de sync leest de werkelijke staat uit Stripe (product + alle prijzen) en voert alleen het verschil uit. Een tweede sync verandert niets.

## Datamodel

- `stripe_catalog_products`: `lesson_type_option_id` (FK, `ON DELETE SET NULL`; een verwijderde lesvorm wordt een "wees" die bij de volgende sync wordt gearchiveerd), `stripe_product_id`, `product_name`, `is_active_in_stripe`, `sync_status` (`pending` | `in_sync` | `error`), `last_synced_at`, `last_error`.
- `stripe_catalog_prices`: `catalog_product_id`, `tariff_id`, `age_category`, `amount_cents`, `recurring`, `lookup_key`, `stripe_price_id`, `is_active_in_stripe`.
- `accounting_settings`: `stripe_tax_rate_21_id`, `stripe_tax_rate_exempt_id`, `stripe_catalog_last_full_sync_at`.
- Triggers zetten een catalogusrij op `pending` bij een wijziging van een lessoort (naam/actief), lesvorm of tarief.
- Toegang: alleen admin/site_admin lezen. Schrijven gebeurt alleen door de edge function (service role).

## Edge function `sync-stripe-catalog`

- POST, alleen admin/site_admin. Body `{}` synchroniseert alles; `{ "lesson_type_id": "<uuid>" }` alleen die lessoort. Weesrijen worden altijd meegenomen.
- Zonder `STRIPE_SECRET_KEY`: antwoord 200 `{ configured: false, message }`. Er gebeurt niets en de app crasht niet.
- Een fout bij één lesvorm stopt de rest niet. De fout wordt veilig ingekort (`getSafeErrorMessage`) en opgeslagen in `last_error`.
- Bestanden: `catalogPure.ts` (naam, gewenste prijzen, vergelijking, status; pure functies), `runCatalogSync.ts` (Stripe- en databaseaanroepen), `handler.ts`, `validation.ts`.

## Gebruik door abonnementen

Sinds fase 3a verwijzen abonnementsfasen naar deze prijzen (opgezocht via `lookup_key`), met het btw-tarief per regel. Een sync markeert en herbouwt daarna de lopende abonnementen van de lessoort. De sync maakt ook de klantportaalconfiguratie (opzeggen uit). Zie `stripe-abonnementen.md`.

## In de app

- **Lessoorten:** na opslaan (lessoort, nieuwe/gewijzigde lesvorm, verwijderde lesvorm) loopt de sync op de achtergrond voor die lessoort. Je krijgt een melding. Opslaan mislukt nooit door Stripe.
- **Instellingen → Boekhouding-instellingen** (nu in het menu): kaart "Stripe-catalogus" met de knop **Synchroniseer met Stripe** en per lesvorm de status (In sync / Wacht op synchronisatie / Ontbreekt / Ontbreekt: geen tarief / Gearchiveerd / Fout), het aantal actieve prijzen, de laatste sync en de fout.

## Tests (zonder Stripe-aanroepen)

- `tests/code/billing/stripeCatalogPure.test.ts`: productnaam, lookup-sleutel, gewenste prijzen (privé, Popkids, Laatbloeiers, verlopen/toekomstig tarief), prijsparameters (inclusive), vergelijking (niets doen, aanmaken, ander bedrag, reactiveren, naam, archiveren, wees, geen tarief).
- `tests/code/billing/syncStripeCatalogValidation.test.ts`: body-validatie en het antwoord zonder sleutel.
- `tests/code/billing/stripeCatalogStatus.test.ts`: status in het overzicht.

## Zelf doen (testmodus)

1. `bun run db:reset` (reset + types).
2. Supabase → Edge Functions → Secrets (lovable-branch): `STRIPE_SECRET_KEY` = `sk_test_…`.
3. In de app: Instellingen → Boekhouding-instellingen → **Synchroniseer met Stripe**.
4. Stripe Dashboard (testmodus) → Product catalog: controleer producten en prijzen. Onder Settings → Tax → Tax rates staan "Btw 21%" en "Btw vrijgesteld".
5. Pas in Stripe geen prijzen aan en maak er geen aan. Wijzig tarieven alleen in de app.

## Zelfherstel bij een andere Stripe-sleutel

Wordt `STRIPE_SECRET_KEY` vervangen door die van een ander Stripe-account, dan horen opgeslagen id's niet meer bij het account (Stripe: `resource_missing`). De sync controleert daarom elk opgeslagen id:

- **Btw-tarieven:** opgehaald en alleen hergebruikt als ze bestaan en actief zijn; anders zoeken op `metadata.mcp_key`, anders aanmaken. Nieuwe id's worden opgeslagen.
- **Klantportaal:** bestaat de opgeslagen configuratie niet, dan wordt de eigen configuratie (`metadata.mcp_key = portal_v1`) gezocht of aangemaakt.
- **Product:** opgeslagen id ontbreekt → zoeken op `metadata.lesson_type_option_id` → aanmaken.
- **Prijzen:** worden per `lookup_key` aangemaakt op het actuele product; catalogusrijen met een prijs-id die niet op het actuele product bestaat, worden inactief.
- Andere Stripe-fouten (netwerk, rechten) worden niet als "ontbreekt" behandeld.
- Een tweede sync verandert niets. Pure logica: `_shared/stripeRecoveryPure.ts`, tests: `tests/code/billing/stripeRecoveryPure.test.ts`.
