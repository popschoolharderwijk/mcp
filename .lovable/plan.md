# Fase 1 — Tariefmodel volgens de tarievenlijst

Lesgeld komt voortaan uit een vast maandbedrag per lesvorm, met ingangsdatum, voor SEPA, Stripe en handmatig. Stripe edge functions, `_shared/billing*.ts`, de SEPA-XML-opbouw en mandaten blijven ongemoeid. We zijn nog niet live, dus de oude berekening wordt direct vervangen, zonder overgangsregeling.

## 1. Datamodel

**Lesvorm = bestaande rij in `lesson_type_options`** (lessoort + duur + frequentie). Die tabel blijft de lesvorm. Prijzen gaan naar een nieuwe tabel met historie.

Wijzigingen aan `lesson_type_options`:
- `billing_kind text not null default 'monthly'` met de waarden `monthly` of `one_off` (groepslessen, 8 lessen).
- `has_adult_tariff boolean not null default true`. Op `false` voor lesvormen zonder 21+-tarief (Popkids, Popkoor 12-18, Klank en Kriebels enzovoort). Andersom kan ook: alleen een 21+-tarief (Laatbloeiers). Dat volgt vanzelf als `under_21` leeg is.
- `label text`: optionele weergavenaam, bijvoorbeeld "Popkoor (18+)", voor lesvormen met dezelfde lessoort en een andere doelgroep.
- `price_per_lesson`, `price_per_lesson_under_21_cents` en `price_per_lesson_adult_cents` **vervallen**. `price_per_lesson` op `lesson_agreements` en `lesson_groups` vervalt als bron. Hij gaat eruit waar het veilig kan (zie open vraag 1).

Nieuwe tabel `lesson_type_option_tariffs`:

```text
id uuid pk
lesson_type_option_id uuid fk -> lesson_type_options ON DELETE CASCADE
effective_from date not null              -- ingangsdatum
amount_under_21_cents bigint null         -- maandbedrag of eenmalig bedrag
amount_adult_cents bigint null            -- incl. 21% btw, exact zoals op de lijst
unique (lesson_type_option_id, effective_from)
audit-velden + trigger (apply_audit_trail)
```
- Validatietrigger: minstens één bedrag gevuld, bedragen > 0, en `amount_adult_cents` leeg als `has_adult_tariff = false`.
- GRANT: select voor authenticated (zoals de huidige opties: zichtbaar voor ingelogden en voor het aanmeldformulier, dus ook anon select). Wijzigen alleen voor admin/site_admin. Alles volgens de PERMISSIVE en geconsolideerde policies, plus service_role.

Wijzigingen aan `lesson_agreements` (looptijd):
- `lesson_type_option_id uuid fk` (RESTRICT): de overeenkomst verwijst naar de lesvorm, niet meer naar losse duur en prijs.
- `minimum_term_end date`: ingevuld door een trigger op start_date + 6 maanden − 1 dag.
- `cancellation_requested_at timestamptz`, `cancellation_effective_date date`. Een opzegging wordt berekend als het einde van de lopende periode: eerst `minimum_term_end`, daarna steeds 31 juli. Dan rekening houden met de opzegtermijn. Bij een te late opzegging schuift de einddatum naar het einde van de volgende periode.
- `monthly_amount_cents` **vervalt** (het bedrag wordt per maand berekend).

Wijzigingen aan `accounting_settings`:
- `cancellation_notice_days integer not null default 30`. Instelbaar in Boekhouding-instellingen.

Eén migratie: `..._tariefmodel_maandbedragen_per_lesvorm.sql`. Een tweede migratie vervangt `build_direct_debit_batch_items` (zie 3).

## 2. Eén rekenhelper

Bestand `src/lib/billing/monthlyTariff.ts` (pure functies):

- `resolveTariff(tariffs, onDate)` geeft het tarief met de hoogste `effective_from` die op of voor `onDate` ligt.
- `adultTariffStartsOn(dateOfBirth)` geeft de 1e van de maand ná de 21e verjaardag.
- `pickAgeCategory(dob, monthStart, option)` geeft `under_21` of `adult`. Zonder 21+-tarief blijft het altijd `under_21`. Zonder `under_21`-tarief is het `adult`. Is de geboortedatum onbekend, dan geldt `adult` (dat is nu ook zo).
- `computeAgreementMonthAmount({ agreement, option, tariffs, dateOfBirth, month })` geeft `{ amountCents, ageCategory, btwRate: 0|21, exclCents, btwCents, prorated, tariffEffectiveFrom }`:
  - Augustus, een maand vóór de start of een maand na de einddatum of opzegdatum geeft 0.
  - Het tarief is het tarief dat geldt op de 1e van de maand. Een nieuwe ingangsdatum gaat dus automatisch in, ook bij lopende overeenkomsten.
  - De eerste maand gaat naar rato: bedrag × (resterende dagen incl. startdag / dagen in de maand), afgerond op centen. Een laatste deelmaand rekent niet naar rato, omdat opzeggen per periode-einde gaat.
  - Btw bij 21+: excl = round(bedrag / 1,21), btw = bedrag − excl. Het totaal blijft exact het lijstbedrag.
  - Bij `one_off` alleen in de startmaand het eenmalige bedrag, verder 0.
- `computeCancellationEffectiveDate(agreement, requestedAt, noticeDays)` en `computeMinimumTermEnd(startDate)`.

**SQL-tegenhanger:** `public.compute_agreement_month_amount(agreement_id, month date)` (security definer, niet uitvoerbaar voor authenticated). De SEPA-batch wordt in SQL opgebouwd, dus de rekenregels bestaan twee keer. Om ze gelijk te houden komt er één gedeelde tabel met testgevallen (`tests/code/billing/monthlyTariffCases.ts`) die de TS-test gebruikt. Dezelfde gevallen staan als RLS/DB-test klaar onder `tests/rls`; die draait de gebruiker zelf, want hij heeft Supabase nodig.

## 3. Gebruik van de helper

- **SEPA-batch:** `build_direct_debit_batch_items` gebruikt `compute_agreement_month_amount(la.id, collection_month)` in plaats van `COALESCE(monthly_amount_cents, price_per_lesson*100)`. Regels met 0 worden overgeslagen, zoals nu. Het Stripe-filter blijft.
- **Eigen facturen** (`generate-invoice`): de bedragen per regel komen uit de batch-items. Btw per regel volgt uit de leeftijdscategorie van die maand (21+ = 21% inbegrepen). Ik pas `processStudentInvoicePure.ts` en `invoicePure.ts` aan, zodat ze de btw-uitsplitsing van de helper gebruiken: dezelfde formule, gekopieerd als pure functie in de edge-functiemap, want edge functions kunnen niet uit `src/` importeren. `_shared/billing*.ts` blijft ongemoeid.
- **Overeenkomst-wizard en overeenkomst:** het preview-blok toont "Maandbedrag € 73,38 (vrijgesteld van btw)" of "€ 88,79 incl. € 15,41 btw". Bij instroom toont het ook het bedrag voor de eerste maand naar rato, plus de looptijd: minimaal tot …, daarna per schooljaar. De wizard kiest een lesvorm, niet meer los een duur en prijs.
- **Weg:** `calculateYearlyAmount.ts` en `calculateYearlyAmountHelpers.ts` (lesaantal-berekening, niet meer nodig) met hun tests, `monthly_amount_cents` en de prijs-per-les-velden in formulieren. `schoolYear.ts` blijft (augustus en schooljaar).
- **Beheer lessoorten** (`/lesson-types/:id`): de optie-modal krijgt de velden label, soort (maandelijks of eenmalig), "heeft 21+-tarief", plus een tarieventabel met historie en een knop "Nieuw tarief per datum". Nieuwe lesvormen maak je daar aan, met prijzen.

## 4. Looptijd en opzeggen

- Bij het aanmaken wordt `minimum_term_end` automatisch gezet.
- Op de overeenkomst komt een knop "Opzeggen" (beheer): die toont de berekende einddatum en zet `cancellation_effective_date`. Vanaf de maand daarna wordt er niet meer geïnd en niet meer gefactureerd.
- In Boekhouding-instellingen komt het veld "Opzegtermijn (dagen)".

## 5. Seed en testdata

`supabase/seed.sql` (test) krijgt de lessoorten en lesvormen uit de tarievenlijst, met tarieven per 1 september 2026 (alle bedragen exact). Groepslessen worden `one_off`. Popkids, Popkoor 12-18, Klank en Kriebels, Notenkrakers, Mini Maestro's en De Muziekclub krijgen geen 21+-tarief. Laatbloeiers krijgt alleen 21+. Bestaande testovereenkomsten krijgen een `lesson_type_option_id`. De lessoorten zelf voer je in productie in via de beheerschermen; dat staat in de handleiding.

## Testgevallen voor de helper

1. Wekelijks privé, < 21, volle maand oktober 2026 geeft 7338, btw 0.
2. Hetzelfde, 21+ geeft 8879, excl 7338, btw 1541.
3. 21e verjaardag op 14 maart 2027: maart nog < 21 (7338), april 21+ (8879).
4. Verjaardag op de 1e van een maand (1 maart): 21+ pas vanaf 1 april.
5. Instroom op 15 oktober 2026 (31 dagen): 7338 × 17/31 = 4024. November vol.
6. Augustus 2027 geeft 0, september 2027 weer vol.
7. Tariefwijziging: tarief A per 1 september 2026 en tarief B per 1 september 2027. Juli 2027 rekent A, september 2027 rekent B. De overeenkomst loopt door.
8. Popkids (geen 21+), leerling van 25 geeft 2455, btw 0.
9. Alleen een 21+-tarief (Laatbloeiers), leerling van 19 geeft het 21+-bedrag (open vraag 3).
10. Maand vóór de start en maand na de opzegdatum geven 0.
11. Groepsles eenmalig: in de startmaand 6600, de maand erna 0.
12. Geen geldend tarief op de datum geeft een foutmelding ("Geen tarief ingesteld per …").
13. Opzegging: start 1 september 2026, opgezegd 10 januari 2027 met 30 dagen termijn, wordt einde 28 februari 2027 (minimale looptijd). Opgezegd 10 juli 2027 wordt 31 juli 2028 (te laat voor 31 juli 2027).
14. Geboortedatum onbekend geeft het 21+-tarief.

## Bestanden (globaal)

- Nieuw: `src/lib/billing/monthlyTariff.ts`, `src/lib/billing/agreementTerm.ts`, tests onder `tests/code/billing/`, `docs/integrations/tariefmodel.md`, twee migraties.
- Gewijzigd: `src/pages/lesson-type-info/*` (modal, types, persistence, validatie), `LessonTypeOptionSelect.tsx`, wizard (`wizardFormTypes`, `wizardDataHooks`, `useWizardOptionPrefill`, `agreementWizardHelpers`, `wizardDerivedState`, save helpers), `agreementBillingPreviewHelpers.ts`, `loadAgreementBillingPreview.ts`, `useAgreementBillingPreview.ts`, `LessonAgreementPreviewBlock.tsx`, Boekhouding-instellingen en `src/lib/accounting/types.ts`, `generate-invoice/{processStudentInvoicePure,invoicePure}.ts`, aanmeld- en duo-functies alleen waar ze `price_per_lesson` invullen (`create-duo-agreements`, `approve-signup-request`), `supabase/seed.sql`, `UserManual.tsx`, `CHANGELOG.md`.
- Verwijderd: `calculateYearlyAmount*.ts` en hun tests.

## Afronding bij uitvoering

Migraties, tests (`bun test code`), `bun run check` en `check:ci` groen, docs, handleiding en CHANGELOG. Daarna draai jij `bun run db:reset` voor de types.

## Open vragen

1. `price_per_lesson` op `lesson_agreements` en `lesson_groups` gebruiken ook urenrapportage en Stripe (fase 3). Voorstel: nu nullable maken en niet meer vullen, en de kolom in fase 3 verwijderen. Akkoord?
2. Naar rato: op basis van kalenderdagen (zoals hierboven), of op basis van resterende lessen in de maand?
3. Lesvorm met alleen een 21+-tarief (Laatbloeiers) en een leerling onder de 21: het 21+-bedrag rekenen, of de lesvorm blokkeren voor die leerling?
4. Duo per persoon: elke duo-leerling krijgt een eigen overeenkomst met hetzelfde per-persoon-tarief en een eigen leeftijdscategorie. Klopt dat?
5. Is "half jaar" precies 6 kalendermaanden vanaf de startdatum, of tot het eerstvolgende 31 januari of 31 juli?
6. Groepslessen: wordt het eenmalige bedrag geïnd in de incassobatch van de startmaand (SEPA), of alleen gefactureerd? Fase 4 regelt Stripe.
