# Diagnose mcp-dev — 27 oktober 2026 (alleen onderzoek, niets gewijzigd)

## Samenvatting
Het schema van mcp-dev staat nu volledig gelijk met de branch `lovable`. Vandaag om 12:10 UTC is de database gereset en opnieuw gevuld met seed-data. De enige fout die de logs aantonen is de 401 "Invalid token". Die hoort bij de controle wie er ingelogd is, niet bij het schema. Na de deploy van 12:30 komt die fout niet meer terug.

## 1. Actuele fouten
- **schedule-trial-lesson:** om 12:29:50, 12:30:02 en 12:30:09 staat er "auth.getUser failed: Auth session missing" en de functie gaf een 401 "Invalid token" terug. De oorzaak is dat `getUser()` werd aangeroepen zonder het token van de gebruiker. Na de deploy van 12:30 is de functie om 12:31 en 12:33 opnieuw opgestart en er staan geen nieuwe waarschuwingen in de log. **De 401 is daarmee voor deze functie weg.**
- **send-template-email:** om 12:28:57 opgestart, zonder fouten. De eerdere fout "Kon template niet ophalen" door `body_markdown` komt niet meer voor.
- **send-agreement-confirmation** en **create-duo-agreements:** er staan geen logs in het venster. Deze functies zijn sinds de opslagpoging niet aangeroepen, of ze zijn uitgevallen vóór het opstarten. De API-logs met statuscodes kon ik niet uitlezen, want de analytics-query gaf geen resultaat. De preview-telemetrie bevatte ook geen netwerk- of runtimefouten.
- **Waarschijnlijke oorzaak van de fout bij het opslaan van een overeenkomst:** dezelfde 401. De wizard roept `send-agreement-confirmation` aan, en die functie gebruikt dezelfde gedeelde controle uit `_shared/supabase.ts`. Bij de deploy van 12:30 zijn alleen `schedule-trial-lesson` en `sync-stripe-catalog` opnieuw uitgerold. De andere functies draaien nog de oude code.
- **Niet bevestigd:** de exacte foutmelding bij het opslaan. Die stond niet in de beschikbare logs.

## 2. Migratiestatus
- In `supabase_migrations.schema_migrations` staan 39 versies, en in `supabase/migrations/` staan 39 bestanden. De versies komen één op één overeen, van `20260116145900_baseline` tot en met `20261022072321_beveilig_dagelijkse_stripe_taak`.
- **Er ontbreken geen migraties**, ook niet van vóór oktober. Optie A (22 oktober) is inmiddels achterhaald, omdat de reset van vandaag alles in volgorde heeft toegepast.

## 3. Schema tegenover de code
- `email_templates`: `body_html` en `is_enabled` zijn aanwezig. Er staan 6 templates in, alle 6 ingeschakeld, en dat zijn precies de 6 sleutels uit `src/lib/email/events.ts`.
- `lesson_type_options` heeft de kolommen `label`, `billing_kind` en `has_adult_tariff`.
- `lesson_type_option_tariffs`, `subscriptions` (claim- en first_invoice-kolommen), `lesson_signup_requests.payment_method`, `students.date_of_birth`, `trial_lessons`, `agreement_payment_links` en `payment_link_requests` zijn allemaal aanwezig.
- De functies `claim_schedule_build(uuid, text)`, `preview_lesson_fee` en `set_student_date_of_birth_if_missing` bestaan.
- Ik heb geen ontbrekende kolommen, tabellen of functies gevonden.

## 4. Aantallen en tijdstippen
| Tabel | Aantal |
|---|---|
| auth.users | 88 |
| students | 60 |
| lesson_agreements | 100 |
| lesson_type_options | 27 |
| lesson_type_option_tariffs | 24 |
| trial_lessons | 4 |
| lesson_signup_requests | 5 (laatste om 12:28) |
| subscriptions | 0 |
| stripe_catalog_prices | 0 |

De oudste `profiles.created_at` en de seed-rijen van overeenkomsten en proeflessen hebben allemaal hetzelfde tijdstip: **27 oktober 2026, 12:10:27 UTC**. De database is dus vandaag gereset en opnieuw gevuld met seed-data. De eerdere 1.466 overeenkomsten uit de legacy-import zijn weg.

## 5. Advies (niet uitgevoerd)
1. **Geen migraties nodig.** Het schema is compleet, dus voer geen reset uit en laat optie A vervallen.
2. **Alle edge functions opnieuw uitrollen** met de fix in `_shared/supabase.ts`, minstens `send-agreement-confirmation`, `create-duo-agreements`, `approve-signup-request`, `send-direct-debit-invite`, `create-subscription-checkout`, `sync-stripe-subscription` en `create-user`. Test daarna proefles inplannen en een overeenkomst opslaan met een ingelogde beheerder. Komt er dan nog een fout, lees dan direct de log van die functie.
3. **Stripe-catalogus:** klik op **Synchroniseer met Stripe**. Er staan nu 0 prijzen, en zonder catalogus mislukken Stripe-overeenkomsten bij het machtigen.
4. **Tarieven:** de seed heeft 24 tarieven geplaatst, dus opnieuw vullen is niet nodig.
5. **Mailtemplates:** de 6 standaardteksten staan er. Controleer alleen of de afzender en Resend werken met een testaanmelding.
6. **Legacy-data:** wil je de oude leerlingen terug, voer dan de Excel-import opnieuw uit via Instellingen. Doe dat pas na stap 2.
7. **Types:** die kloppen met het schema. Alleen `bun run supabase:types` is nodig, als je dat lokaal wilt bijwerken.

## Risico's
- Bij het opnieuw uitrollen worden geen gegevens gewijzigd.
- Een nieuwe reset wist opnieuw alle testdata, waaronder de 5 aanmeldingen van vandaag. Daarom is een reset af te raden.
