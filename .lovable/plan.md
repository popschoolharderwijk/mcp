# Fase 2 — prijzen automatisch naar Stripe (+ correctie looptijd)

De app blijft de bron. Lesvormen en tarieven uit Beheer → Lessoorten komen automatisch en idempotent in Stripe. Er komen geen abonnementen en er verandert niets aan SEPA. `_shared/billing*.ts`, `create-subscription-checkout`, `stripe-webhook` en de schedules blijven zoals ze zijn.

## 1. Datamodel (één migratie: `..._stripe_catalogus_lesvormen.sql`)

**Nieuwe tabel `stripe_catalog_products`** (één rij per lesvorm, blijft bestaan ook als de lesvorm wordt verwijderd):
- `lesson_type_option_id` uuid, uniek, FK `ON DELETE SET NULL` (na verwijderen blijft de rij als "wees" bewaard, zodat de sync het product kan archiveren)
- `stripe_product_id` text, uniek
- `product_name` text (laatst gesynchroniseerde naam)
- `is_active_in_stripe` boolean
- `sync_status` text: `in_sync` | `pending` | `error`
- `last_synced_at`, `last_error` (korte, veilige tekst)
- audit-velden + trigger

**Nieuwe tabel `stripe_catalog_prices`** (één rij per tarief × leeftijdscategorie):
- `tariff_id` uuid, FK naar `lesson_type_option_tariffs` `ON DELETE SET NULL`
- `catalog_product_id` uuid, FK `ON DELETE CASCADE`
- `age_category` text: `under_21` | `adult`
- `amount_cents` bigint, `recurring` boolean (maand of eenmalig)
- `stripe_price_id` text uniek, `lookup_key` text uniek
- `is_active_in_stripe` boolean
- uniek op (`tariff_id`, `age_category`, `amount_cents`)

**`accounting_settings`**: `stripe_tax_rate_21_id`, `stripe_tax_rate_exempt_id`, `stripe_catalog_last_full_sync_at`.

**Toegang:** GRANT SELECT aan authenticated, ALL aan service_role. RLS met één PERMISSIVE policy: alleen admin/site_admin mogen lezen. Schrijven doet alleen de edge function (service_role).

**Trigger "pending":** bij wijzigingen in `lesson_type_options`, `lesson_type_option_tariffs` en `lesson_types` (naam, `is_active`) wordt de catalogusrij op `pending` gezet. Daarmee toont het overzicht direct wat nog niet gesynchroniseerd is.

## 2. Edge function `sync-stripe-catalog`

- Alleen POST, met `requireAdminUser`. Body: `{ lesson_type_option_ids?: string[] }`. Leeg betekent alles, inclusief weesrijen.
- Zonder `STRIPE_SECRET_KEY` volgt een 200-antwoord met `{ configured: false, message: "Stripe is nog niet ingesteld" }`. De app crasht dan niet.
- Foutmeldingen lopen via `getSafeErrorMessage`. Per lesvorm wordt een eventuele fout opgeslagen in `last_error`, en de sync gaat door met de volgende lesvorm.
- Opbouw volgens het bestaande patroon (`handler.ts`, `validation.ts`, pure helpers in `*Pure.ts`). Alleen `getStripe()` uit `_shared/stripe.ts` wordt hergebruikt.

**Stappen per lesvorm:**
1. Btw-tarieven zorgen dat ze bestaan (eenmalig): "Btw 21%" (inclusive, 21%, NL) en "Btw vrijgesteld" (inclusive, 0%). Eerst zoeken op metadata `mcp_key`, anders aanmaken. Het id wordt opgeslagen in `accounting_settings`.
2. Product: het bestaande `stripe_product_id` gebruiken. Ontbreekt dat, dan zoeken met `products.search` op `metadata['lesson_type_option_id']`, en anders aanmaken. Naam en `active` bijwerken als die afwijken.
3. Prijzen: de gewenste set wordt puur berekend. Bestaande prijzen worden opgehaald met `prices.list({ lookup_keys })`, ontbrekende worden aangemaakt. Een prijs met dezelfde `lookup_key` maar een ander bedrag mag niet bestaan (het bedrag zit in de sleutel). Prijzen die niet meer gewenst zijn, worden gearchiveerd (`active: false`).
4. Weesproducten (lesvorm verwijderd) en uitgezette lesvormen/lessoorten krijgen product `active: false` en worden nooit verwijderd.
5. Het antwoord bevat een overzicht per lesvorm: `in_sync` / `missing` / `error` / `archived`.

**Idempotentie:** de `lookup_key` is deterministisch, bijvoorbeeld `mcp_opt_<optionId8>_<effective_from>_<u21|adult>_<amount>`. Daarnaast staat er metadata op elk object (`lesson_type_option_id`, `tariff_id`, `age_category`) en wordt `Idempotency-Key` gebruikt bij create-calls. Een herhaalde sync maakt daardoor nooit dubbele prijzen.

**Welke tarieven:** het tarief dat nu geldt plus alle tarieven met een toekomstige ingangsdatum zijn actief. Verlopen tarieven worden gearchiveerd. Lopende abonnementen blijven werken, omdat een gearchiveerde prijs bruikbaar blijft voor bestaande abonnementen.

## 3. Btw-aanpak in Stripe

- Prijzen krijgen `tax_behavior: 'inclusive'`. Daarmee is het lijstbedrag (bijv. € 88,79) exact het eindbedrag.
- Het btw-tarief hangt **niet aan de prijs** (Stripe ondersteunt dat niet op Price). Het wordt in fase 3 per abonnementsregel gekoppeld via `subscription_items[].tax_rates`: het 21%-tarief voor 21+-prijzen en het vrijgestelde 0%-tarief voor prijzen onder 21. Zo staat op de factuur "Btw 21% (inbegrepen)" met € 15,41, of "Btw vrijgesteld 0%".
- Om dit in fase 3 eenvoudig te maken, krijgt elke prijs metadata `tax_rate_key: 'nl_21_incl' | 'exempt'`.
- Stripe Tax (automatisch) gebruiken we niet: de tarieven zijn vast en het bedrag moet exact blijven.

## 4. Schermen

- **Lessoort opslaan** (`useLessonTypeSubmit`): na succesvol opslaan wordt `sync-stripe-catalog` aangeroepen met de betrokken lesvorm-id's, plus de verwijderde id's (die worden weesrijen). Dit gebeurt op de achtergrond, met een toast als het lukt of niet lukt. Het opslaan zelf faalt nooit door Stripe.
- **Optietabel op de lessoortpagina:** een statuskolom "Stripe" (In sync / Wacht / Fout, met de fouttekst als tooltip, status via tokens met tekstlabel).
- **Nieuwe sectie "Stripe-catalogus"** onder Instellingen → Boekhouding (admin/site_admin):
  - knop "Synchroniseer met Stripe"
  - een `DataTable` per lesvorm: naam, status, aantal prijzen, laatste sync, fout
  - de melding "Stripe is nog niet ingesteld" als de sleutel ontbreekt

## 5. Correctie looptijd (fase 1)

- `compute_minimum_term_end(start)` wordt `(date_trunc('month', start + 6 months − 1 day) + 1 month − 1 day)::date`.
- Bijwerken van bestaande testoverkomsten in dezelfde migratie: `UPDATE lesson_agreements SET minimum_term_end = compute_minimum_term_end(start_date)`.
- De btw-logica blijft ongewijzigd.

## 6. Tests (`tests/code/billing/`, geen echte Stripe-aanroepen)

- `stripeCatalogPure.test.ts`:
  - naam: "Gitaar · 30 min · wekelijks"; met label; tweewekelijks; eenmalig ("Klank en Kriebels · eenmalig")
  - `lookup_key`: deterministisch en verandert mee met het bedrag
  - gewenste prijzen: privé (2 prijzen, maandelijks); Popkids (alleen onder 21); Laatbloeiers (alleen 21+, eenmalig); verlopen tarief valt weg, toekomstig tarief blijft
  - btw-sleutel per categorie
  - vergelijking app ↔ Stripe: niets te doen / prijs aanmaken / prijs archiveren / naam bijwerken / product archiveren bij een uitgezette lesvorm of wees
- `syncStripeCatalogValidation.test.ts`: body-validatie en het antwoord bij een ontbrekende sleutel.
- `lessonFeeRules.test.ts` (PGlite): start 15-10-2026 geeft 30-04-2027; start 01-09-2026 geeft 28-02-2027; start 31-08-2026 geeft 28-02-2027.

## 7. Afronding bij uitvoering

Migratie, edge function, schermen en tests. Daarna `bun run check` en `check:ci`. Documentatie: `docs/integrations/stripe-catalogus.md` (nieuw), `tariefmodel.md` en `stripe-status-en-heractivering.md` bijwerken, plus de handleiding en CHANGELOG 1.4.0. AGENTS.md krijgt de regel "Stripe catalog is derived from app tariffs; never edited in Stripe".

**Wat jullie zelf doen:** `bun run db:reset`. In Stripe testmodus `STRIPE_SECRET_KEY` instellen (lovable-branch). Een keer "Synchroniseer met Stripe" draaien en in het Dashboard → Products de producten controleren. Er hoeven geen btw-tarieven met de hand aangemaakt te worden.

## Open vragen (aanname tussen haakjes)

1. Verlopen tarieven archiveren in Stripe? (ja; bestaande abonnementen blijven werken)
2. Ook een product maken voor lesvormen zonder ingevuld tarief? (nee, status "ontbreekt: geen tarief")
3. Mag het overzicht onder Instellingen → Boekhouding staan, of liever een aparte pagina onder Financiën? (Boekhouding)
4. Productnaam inclusief "· duo" voor duo-lessoorten? (de lessoortnaam bevat dat al, dus niets extra)
