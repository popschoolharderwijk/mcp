# Overeenkomst en betaalverzoek in één stap

Dit plan bouwt voort op de bugfix voor dubbele abonnementen (claim met `claim_schedule_build` en idempotency keys op schedules en facturen).

## Huidige situatie (gecontroleerd)
- Bij opslaan stuurt de wizard (`wizardSaveHelpers.ts` → `sendAgreementCreatedMails`) `agreement_created` naar het account-e-mailadres van de leerling en `agreement_created_teacher` naar de docent. Duo stuurt eigen mails (`create-duo-agreements/sendDuoConfirmationEmails.ts`). In de wizard bestaat ook een aparte aanroep van `send-direct-debit-invite`.
- `send-direct-debit-invite` stuurt altijd naar het e-mailadres van het account (`resolveDirectDebitInviteRecipient(profileEmail)`). Alleen de aanhef gebruikt de naam van de ouder of debiteur. De link is een inloglink met token_hash die na 1 uur verloopt.
- `syncAgreementSchedule` begint bij `currentMonth = max(today, start)`. Maanden vóór vandaag worden dus nooit gefactureerd. De eerste maand gaat als losse factuur (`issueFirstInvoice`, idempotency key per maand).

## 1. Eén mail bij opslaan
- **Keuze:** `agreement_created` blijft de enige mail aan de klant en krijgt de nieuwe variabele `betaalblok` (kant-en-klare HTML, zoals `eerste_maand_regel`).
  - **Stripe:** maandbedrag met btw-tekst, een regel over de eerste maand of het inhaalbedrag (alleen als die van toepassing is), looptijd tot en met `minimale_looptijd_tot`, en de knop "Machtiging afgeven".
  - **Op factuur:** "Je ontvangt maandelijks een factuur van ons."
- De losse variabelen (`bedrag`, `eerste_maand_bedrag`, `inhaal_bedrag`, `minimale_looptijd_tot`, `link`) blijven ook beschikbaar, zodat beheer de tekst zelf kan aanpassen.
- `direct_debit_invite` blijft bestaan, maar alleen voor "Opnieuw versturen" (punt 4). Daarmee raken we de bestaande template-structuur niet aan.
- **Versturen gebeurt op de server.** Er komt een nieuwe gedeelde functie `sendAgreementConfirmation(agreementId)` in `_shared/`. Die bouwt de variabelen, het betaalblok en de link, en stuurt de mail via `sendTemplateEmail`. Gebruik:
  - wizard: een nieuwe functie `send-agreement-confirmation`, die de huidige `sendAgreementCreatedMails` voor het klantdeel vervangt en de aparte invite-aanroep uit de wizard haalt;
  - `create-duo-agreements`: één mail per duo-leerling;
  - `approve-signup-request` en de omzetting van een proefles naar een overeenkomst.
- `agreement_created_teacher` blijft apart en ongewijzigd.

## 2. Ontvanger
- Nieuwe pure regel `resolveBillingRecipient`: eerst `students.parent_email`, dan het e-mailadres van de debiteur (als dat veld bestaat; zie open vraag 1), anders het account-e-mailadres. Deze regel geldt voor de bevestiging en voor het betaalverzoek.
- **Probleem:** een inloglink kan alleen naar het account-e-mailadres. Daarom staat er **geen inloglink meer in de mail**, maar een vaste link (punt 3). Op de pagina vraagt de ontvanger een inlogcode aan, die naar het account-e-mailadres gaat.
- Als de ouder geen toegang heeft tot dat adres, is er een oplossing nodig. **Voorstel:** een eenmalige, ondertekende link per overeenkomst die geen inlog nodig heeft (punt 3).

## 3. Vaste link die niet verloopt
- De knop wijst naar `/direct-debit/start?agreement=<id>&t=<token>`.
  - `t` is een willekeurige token per overeenkomst. Die wordt alleen als hash opgeslagen in de nieuwe tabel `agreement_payment_links`, zonder vervaldatum. Bij "Opnieuw versturen" komt er een nieuwe token en vervalt de oude.
- **De pagina met een geldige token:**
  - toont lesvorm, maandbedrag, eerste maand of inhaalbedrag en looptijd (zichtbaar vóór het afgeven van de machtiging, volgens punt 7);
  - heeft de knop "Ga naar iDEAL", die `create-subscription-checkout` met de token aanroept. Inloggen is niet nodig, want de Stripe-klant hoort bij de leerling van de overeenkomst.
- **Zonder geldige token of sessie:** een formulier "Stuur me een nieuwe link". Dat formulier geeft altijd dezelfde melding ("Als dit adres bij ons bekend is, krijg je een mail"). Er wordt nooit een account aangemaakt. Er wordt alleen gemaild als het adres de ontvanger of het account-adres van een wachtende overeenkomst is.
- Ingelogde klanten blijven werken via de bestaande sessie-route.
- Misbruik beperken: tokens van 32 bytes, vergelijken via de hash, en maximaal 3 aanvragen per uur per overeenkomst.
- De oude token_hash-links blijven werken, zodat mails die al verstuurd zijn niet stukgaan.

## 4. "Opnieuw versturen"
- De knop "Stuur betaaluitnodiging" in `SubscriptionCard` wordt "Opnieuw versturen". Die stuurt alleen `direct_debit_invite` met de vaste link (nieuwe token) naar dezelfde ontvanger.
- De knop is alleen zichtbaar zolang de overeenkomst op een machtiging wacht. Elke verzending wordt vastgelegd in `direct_debit_invitations`.

## 5. Status en zichtbaarheid
- **Status op de overeenkomst** wordt afgeleid, niet opgeslagen: "Wacht op machtiging" = Stripe als betaalmethode, actief, en geen schedule of abonnement. Een nieuwe SQL-view `agreements_awaiting_mandate` (`security_invoker=on`) bevat `first_sent_at`, `last_sent_at` en `days_waiting`.
- **Overeenkomstkaart:** een badge "Wacht op machtiging", plus "verstuurd op <datum>".
- **Beheer:** een nieuwe pagina "Wacht op machtiging" onder Financiën. Die toont een `DataTable` met leerling, ontvanger, startdatum, verstuurd op, aantal dagen wachten en de actie "Opnieuw versturen". Op het dashboard staat een teller met een link naar die pagina.
- **Leerlingportaal:** op het dashboard staat een melding "Rond je betaling af" met een knop naar de vaste pagina.
- Er komen geen automatische herinneringen.

## 6. Lessen mogen beginnen
Agenda en overeenkomst blokkeren niets. Dat is al zo; er wordt alleen een test toegevoegd die dit vastlegt.

## 7. Inhaalfactuur
- Bij het opbouwen in `syncAgreementScheduleInner`: als er nog geen schedule bestaat en `start < monthStart(today)`, dan geldt:
  - **inhaalperiode** = `monthStart(start)` tot en met de lopende maand;
  - het **schedule** begint op de 1e van de volgende maand.
  - Anders blijft alles zoals nu (eerste maand naar rato als losse factuur).
- Nieuwe pure functie `planCatchUpInvoice(start, today, months)`. Die levert regels per maand (eerste maand naar rato, augustus € 0 als regel maar zonder bedrag), met btw per regel uit `agreement_fee_months`. Alle bedragen komen uit SQL.
- `issueFirstInvoice` wordt algemener (`issueCatchUpInvoice`): één factuur met één regel per maand en het juiste btw-tarief per regel.
  - Idempotency key: `mcp_catchup_invoice_<agreementId>_<fromMonth>_<toMonth>`, en per regel `..._item_<month>`.
  - Opslag in de bestaande velden `first_invoice_*` plus het nieuwe veld `first_invoice_to_month`. Daardoor maakt een tweede aanroep nooit een tweede factuur.
- Het bedrag wordt vóór de machtiging berekend met dezelfde pure functie, en getoond in de mail (`inhaal_bedrag`) en op de pagina. Hiervoor komt er een nieuwe RPC `preview_agreement_catch_up(agreement_id)`, die de RPC-route voor bedragen volgt.

## 8. Tests (pure delen, geen echte aanroepen naar Stripe)
- `planCatchUpInvoice`:
  - start halverwege oktober, machtiging in december → 3 regels: oktober naar rato, november, december; schedule vanaf januari;
  - start in juli, machtiging in september → juli, augustus € 0, september;
  - start op de 1e → geen naar-rato-regel;
  - machtiging vóór de start → geen inhaalfactuur, wel de bestaande eerste-maandfactuur.
- Opbouw van de idempotency key.
- `resolveBillingRecipient`: ouder, debiteur, account.
- Opbouw van het betaalblok voor Stripe en voor op factuur.
- Afleiding van "Wacht op machtiging" en het aantal dagen.
- Token: hash en vergelijking, en een gelijke melding voor bekende en onbekende adressen.
- De wizard roept de invite-functie niet meer apart aan.

## Datamodel (één migratie, met GRANTs en RLS)
- `agreement_payment_links`: `lesson_agreement_id` (uniek), `token_hash`, `created_at`, `rotated_at`. Alleen `service_role` heeft toegang.
- `subscriptions.first_invoice_to_month date`.
- View `agreements_awaiting_mandate` met `security_invoker`. Beheer leest alles; leerlingen alleen hun eigen rijen via de bestaande RLS.
- RPC `preview_agreement_catch_up`.
- Template `agreement_created`: nieuwe standaardtekst met `{{betaalblok}}`, via migratie en `bootstrap.sql`. `events.ts` en de kopie aan de serverkant krijgen er variabelen bij.

## Wat er wijzigt
- **Serverfuncties:** nieuw `send-agreement-confirmation` en `request-payment-link`; aangepast `send-direct-debit-invite`, `create-subscription-checkout` (token-route), `create-duo-agreements`, `approve-signup-request`, `_shared/subscriptionSchedule.ts`; nieuw `_shared/agreementConfirmation*.ts` en `_shared/catchUpInvoicePure.ts`.
- **Frontend:** `wizardSaveHelpers.ts`, `sendAgreementCreatedMails*` (alleen het docentdeel blijft), `DirectDebitStart.tsx` plus helpers, `SubscriptionCard.tsx`, een nieuwe pagina "Wacht op machtiging" met route, menu en breadcrumb, dashboardkaarten voor beheer en leerling.
- **Documentatie:** `stripe-abonnementen.md`, `email-templates.md`, handleiding, CHANGELOG.

## Risico's
- Een vaste link zonder inlog is gevoelig. Hij geeft alleen toegang tot het afgeven van een machtiging voor deze ene overeenkomst, en toont geen persoonsgegevens behalve de lesgegevens.
- Een grote inhaalfactuur kan een hoog bedrag zijn. De klant ziet dat vóór de machtiging.
- Als de inhaalfactuur en een losse eerste-maandfactuur allebei bestaan, kan er dubbel gefactureerd worden. Dat voorkomen we met één veldset en één idempotency key; een test legt dit vast.
- Templates die beheer al heeft aangepast: de migratie werkt de tekst alleen bij als die nog de standaardtekst is.

## Open vragen
1. Heeft de debiteur een eigen e-mailveld? `students` heeft nu alleen `parent_email` en geen `debtor_email`. Voorstel: `parent_email`, anders het account.
2. Mag de vaste link zonder inlog direct naar iDEAL (voorstel), of moet de klant altijd eerst inloggen met een code naar het account-e-mailadres?
3. Waar komt de vervaldatum van de inhaalfactuur: direct (voorstel: zelfde regel als de eerste maand) of 14 dagen?
4. Moeten overeenkomsten op factuur ook op het overzicht "Wacht op machtiging" (voorstel: nee)?
