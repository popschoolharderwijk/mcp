# Stripe-abonnementen op de catalogus (fase 3a)

Stand: 20 oktober 2026. Vervangt de oude opzet (per overeenkomst een eigen product met 11 prijzen, `end_behavior: release`).

## In het kort

- Elke Stripe-overeenkomst krijgt **één subscription schedule** met fasen op de **catalogusprijzen** uit fase 2 (`stripe-catalogus.md`).
- Bedragen komen uit de database (`compute_lesson_fee` via `agreement_fee_months`); Stripe rekent niets zelf (`proration_behavior: none`).
- De **eerste maand** (naar rato of niet) is een **losse factuur** op de startdatum met het bedrag uit de bron. Het abonnement start op de 1e van de maand erna, met anchor op de 1e.
- **Augustus** is een trial-fase: Stripe maakt een factuur van € 0 (zichtbaar voor de leerling; akkoord 20 oktober).
- **21+-overstap** en **tariefwijzigingen** zijn toekomstige fasen met een andere prijs en ander btw-tarief; ze worden bij elke opbouw opnieuw uit de bron berekend.
- **Opzeggen** (`cancel_lesson_agreement`) zet de einddatum; de laatste fase eindigt op de 1e na de opzegmaand met `end_behavior: cancel`. Zonder opzegging `release` aan het einde van de horizon is nooit nodig: de dagelijkse taak verlengt de horizon op tijd.
- **Groepslessen** (`one_off`) krijgen geen abonnement (409 in uitnodiging en checkout); eenmalig betalen via Stripe is fase 4.

## Btw per abonnementsregel

| Leeftijdscategorie | Catalogusprijs | Btw-tarief op de regel |
|---|---|---|
| jonger dan 21 | `..._under_21` (inclusive) | "Btw vrijgesteld" (0%) |
| 21+ | `..._21_plus` (inclusive) | "Btw 21%" (inclusief) |

Omdat prijzen en btw-tarief beide inclusief zijn, blijft het eindbedrag exact het lijstbedrag (bijv. € 88,79).

## Horizon en fasen

- De planning loopt tot ná de volgende augustus (`horizonMonthCount`). Stripe staat maximaal 10 fasen toe; gelijke opeenvolgende maanden worden samengevoegd.
- Bij een lopend abonnement blijft de huidige fase (al gefactureerd) staan tot de 1e van volgende maand; alles daarna wordt vervangen.
- Een vrijgegeven (`released`) schedule wordt via de webhook gemarkeerd (`needs_rebuild`) en door de dagelijkse taak opnieuw opgebouwd.

## Wanneer wordt opnieuw opgebouwd?

Database-triggers zetten `subscriptions.needs_rebuild = true` bij:
- wijziging van lesvorm, start-/einddatum, opzegdatum of actief-status van de overeenkomst;
- nieuw/gewijzigd/verwijderd tarief van de lesvorm;
- gewijzigde geboortedatum van de leerling.

Daarna:
- **direct** na "Synchroniseer met Stripe" (en na opslaan in Lessoorten) voor de betreffende lessoort;
- **direct** na "Opzeggen" bij een Stripe-overeenkomst;
- anders **'s nachts** door `stripe-billing-daily`.

## Dubbele schema's voorkomen en herstellen

Na de iDEAL-machtiging kunnen drie paden tegelijk het schema opbouwen (webhook `checkout.session.completed`, webhook `setup_intent.succeeded` en de terugkeerpagina `/direct-debit/start`). Bescherming tegen dubbele schema's:

1. **Atomaire claim in de database** (`claim_schedule_build`): per overeenkomst kan maar één pad tegelijk opbouwen; wie de claim niet krijgt, stopt met "wordt al verwerkt". De claim verloopt na 5 minuten, zodat een mislukte poging opnieuw geprobeerd kan worden. Een unieke index garandeert maximaal één open abonnement per overeenkomst.
2. **Idempotency key** op `subscriptionSchedules.create`: deterministisch per overeenkomst en eerste fase (`mcp_schedule_<overeenkomst>_<eerste-fase-start>`), dus een herhaalde aanroep levert hetzelfde schema op.
3. **Adoptie vóór aanmaken**: bestaat er in Stripe al een open schema met `metadata.lesson_agreement_id` van deze overeenkomst, dan wordt dat overgenomen en bijgewerkt in plaats van een nieuw aangemaakt.
4. **Bewaking**: "Controleer abonnementen" en de dagelijkse taak melden overeenkomsten met meer dan één open schema in Stripe (status "Dubbel"). De knop **Herstel dubbele abonnementen** (Boekhouding-instellingen, alleen beheer) annuleert de overtollige schema's; het schema dat in de app is opgeslagen (anders het oudste) blijft bestaan.

## Edge functions

| Functie | Wat |
|---|---|
| `send-direct-debit-invite` | Betaaluitnodiging: eigen mail `direct_debit_invite` met server-side inloglink (weigert niet-Stripe en groepslessen) |
| `create-subscription-checkout` | iDEAL-machtiging → schedule via `syncAgreementSchedule` |
| `stripe-webhook` | Upsert abonnementen/facturen; status eerste factuur; `subscription_schedule.released` → opnieuw opbouwen |
| `rebuild-subscription-schedule` | "Pas nieuwe tarieven toe" / na opzeggen; per overeenkomst of lessoort |
| `check-stripe-subscriptions` | "Controleer abonnementen": volgende Stripe-factuur vs. `agreement_fee_months`, dubbel-detectie; met `fix_duplicates` annuleert het overtollige schema's |
| `stripe-billing-daily` | Dagelijks: eerste facturen die vandaag ingaan, gemarkeerde rebuilds, horizon verlengen, dubbele schema's melden |
| `sync-stripe-catalog` | Catalogus + klantportaalconfiguratie (opzeggen uit) + rebuilds van de lessoort |

Code: `_shared/subscriptionPlanPure.ts` (pure planning) en `_shared/subscriptionSchedule.ts` (Stripe/DB).

## Klantportaal

### Mijn facturen

`/my-invoices` combineert eigen facturen uit `invoices` met Stripe-facturen uit `subscription_invoices` in één overzicht (datum, bron, status en oorspronkelijk factuurbedrag). Ook de losse eerste-maandfactuur en €0-facturen worden getoond. Stripe-facturen openen via `hosted_invoice_url` of downloaden via `invoice_pdf`; ontbrekende links zijn uitgeschakeld. Het opgeslagen Stripe-invoice-id dient als referentie, omdat deze tabel geen Stripe-factuurnummer of vervaldatum bewaart. De datum is de aanmaakdatum van de opgeslagen factuurrij; er wordt geen vervaldatum verzonnen.

Beide queries gebruiken de ingelogde Supabase-client en bestaande RLS; er is geen schemawijziging of extra factuurgeneratie. Stripe-facturen verschijnen na opslag door de webhook. Laadfouten worden expliciet gemeld met een herkansingsknop. Gerichte tests: `tests/code/invoices/myInvoiceHelpers.test.ts`.

`sync-stripe-catalog` maakt eenmalig een portaalconfiguratie (betaalmethode wijzigen, facturen zien, e-mail/adres; **opzeggen en wijzigen uit**) en bewaart het id in `accounting_settings.stripe_portal_configuration_id`. `create-customer-portal` gebruikt die configuratie.

## Datamodel

`subscriptions` (nieuw): `needs_rebuild`, `schedule_horizon_end`, `last_rebuilt_at`, `last_rebuild_error`, `first_invoice_month`, `first_invoice_due_on`, `first_invoice_status` (`pending`/`sent`/`paid`/`failed`), `first_invoice_stripe_id`, `last_check_*`.
Verwijderd: `lesson_agreements.price_per_lesson`, `stripe_price_id`, `stripe_schedule_id`; `lesson_groups.price_per_lesson`; `lesson_type_options.price_per_lesson*`. De schedule-id staat alleen nog op `subscriptions`.

## Dagelijkse taak (cron)

Op de `lovable`-branch is de taak ingepland (03:00 UTC). Voor **productie** in de SQL-editor van het productieproject uitvoeren (vervang ref en publishable key):

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
SELECT cron.schedule(
  'stripe-billing-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/stripe-billing-daily',
    headers := '{"Content-Type":"application/json","apikey":"<publishable key>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

De functie accepteert alleen de publishable key van het project in de `apikey`-header. Elke stap doet alleen wat vandaag aan de beurt is en is idempotent; een extra aanroep kost hooguit wat Stripe-API-verkeer.

## Tests (geen Stripe-aanroepen)

- `tests/code/billing/subscriptionPlanPure.test.ts`: instroom 15 oktober, augustus-trial, 21e verjaardag, tariefwijziging 1 september, opzegging, groepsles geweigerd, samenvoegen/10-fasenlimiet, controlevergelijking.
- `tests/code/billing/bootstrapTariffs.test.ts`: seed exact gelijk aan de tarievenlijst.
- `paymentMethodPure`, `cronSecret`, `stripeSubscriptionCheck`, `checkoutFlowsPure`.

## Bekende risico's

- Stripe-limiet van 10 fasen: bij veel tariefwissels binnen één horizon wordt de planning korter; de dagelijkse taak verlengt.
- Als de dagelijkse taak een paar dagen niet draait, blijven eerste facturen en wijzigingen liggen tot de volgende run (geen dubbele facturen dankzij idempotency keys).
- `agreement_fee_months` heeft (nog) geen eigen SQL-test; hij is een dunne lus om `compute_agreement_month_fee`, dat wel getest is.

## Betaaluitnodiging (mail)

- De knop **Stuur betaaluitnodiging** roept `send-direct-debit-invite` aan. Die stuurt de eigen template `direct_debit_invite` via `send-template-email` (Resend), niet de algemene Supabase-inlogmail.
- De inloglink komt uit `auth.admin.generateLink` (type `magiclink`, alleen voor een bestaand account) en heeft de vorm `/direct-debit/start?agreement=<id>#token_hash=…&type=email`. Mailscanners openen alleen de pagina; het token zit in de hash en wordt pas in de browser verbruikt (`src/lib/auth/magicLink.ts`).
- Variabelen: `leerling_naam`, `ontvanger_naam` (ouder, anders aparte debiteur, anders leerling), `les_type` (lesvorm), `bedrag` (maandbedrag met btw-tekst via `preview_lesson_fee`), `eerste_maand_bedrag` en `eerste_maand_regel` (leeg als de eerste maand niet naar rato is), `startdatum`, `minimale_looptijd_tot`, `link`.
- Geldigheid van de link = de OTP-verlooptijd van Supabase Auth (standaard 1 uur). Aan te passen in het Supabase-dashboard van mcp-dev: Authentication → Sign In / Providers → Email → **Email OTP Expiration** (maximaal 86400 seconden = 24 uur). Dit geldt ook voor de gewone inlogmail.
- Pure logica en tests: `send-direct-debit-invite/sendDirectDebitInvitePure.ts`, `tests/code/direct-debit/directDebitInviteEmail.test.ts`.

## Fouten en herstel

- Ontbreekt bij het opbouwen van een schedule of de eerste factuur een btw-tarief, prijs of product in het huidige Stripe-account, dan is de fout: "… bestaat niet in het huidige Stripe-account: synchroniseer eerst met Stripe".
- Klanten op `/direct-debit/start` zien nooit de ruwe Stripe-tekst, maar: "Er ging iets mis bij het afronden van je machtiging. Je hoeft niets opnieuw te doen; Popschool neemt contact met je op." De technische fout staat in de logs en als `last_rebuild_error` bij het abonnement (zichtbaar als "Laatste fout" op de overeenkomst).
- Mislukt het opbouwen nadat de machtiging is afgegeven, dan staat de betaalmethode al als standaard op de Stripe-klant. Er komt dan een abonnementsrij met status `incomplete` en `needs_rebuild`. **Synchroniseer** op de overeenkomst of de dagelijkse taak bouwt het schedule later op, met de klant uit `stripe_customers` en diens standaard betaalmethode. Een nieuwe machtiging is niet nodig.
- Zonder standaard betaalmethode op de klant wordt geen schedule gemaakt ("Nog geen machtiging gekoppeld").
- Een opgeslagen Stripe-klant die niet in het huidige account bestaat, wordt bij een nieuwe betaaluitnodiging vervangen.

## Inhaalfactuur (machtiging na de startmaand)

Bestaat er nog geen schema en is er nog geen eerste factuur, en ligt de startmaand vóór de lopende maand, dan:

- worden de maanden vanaf de startmaand t/m de lopende maand uit `agreement_fee_months` gehaald;
- gaan die op **één** losse factuur, één regel per maand (eerste maand naar rato, augustus € 0), met het btw-tarief per regel;
- start het schema op de 1e van de volgende maand.

Idempotentie: factuur `mcp_catchup_invoice_<overeenkomst>_<van>_<tot>`, regels `..._item_<maand>`; de status staat in `subscriptions.first_invoice_*`, zodat een tweede opbouw nooit opnieuw factureert. Logica: `supabase/functions/_shared/catchUpInvoicePure.ts`.
