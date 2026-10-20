# Stripe: status en heractivering

Leesbare uitleg van hoe Stripe in de app zit. Technische details: `stripe-direct-debit.md`.

## 0. Update 20 oktober 2026

- Eindsituatie: **alleen Stripe of op factuur**; de eigen SEPA-incasso verdwijnt in fase 5.
- Fase 2 klaar: lesvormen en tarieven gaan automatisch naar Stripe (`sync-stripe-catalog`), zie `stripe-catalogus.md`.
  Punt 4 hieronder (prijzen per les) is vervangen door de catalogus.
- Fase 3a klaar: abonnementen draaien op de catalogusprijzen met een schedule per overeenkomst, eerste maand als losse factuur, augustus € 0, dagelijkse taak. Stripe is de standaard in de wizard; SEPA is niet meer kiesbaar voor nieuwe overeenkomsten. Zie `stripe-abonnementen.md`.

## 1. Status 13 oktober 2026

**Besluit:** Stripe staat **naast** de eigen SEPA-incasso. De betaalmethode wordt per overeenkomst gekozen:

| Betaalmethode | Incasso | Factuur |
|---|---|---|
| SEPA-incasso | Eigen SEPA-batch (XML voor de bank) | Eigen factuur (PDF, Mijn facturen) |
| Stripe | Stripe (iDEAL-machtiging, daarna maandelijks SEPA via Stripe) | Stripe |
| Handmatig / op factuur | Geen | Zelf |

Later worden bestaande SEPA-mandaten naar Stripe gemigreerd (nog niet gebouwd).

## 2. Wat is teruggezet (stap 5 en 6 van het plan)

- **Wizard:** optie "Stripe" in de betaalmethode-keuze (`PaymentMethodOptions.tsx`).
- **Abonnement-kaart:** `SubscriptionCard` onder de wizard bij een opgeslagen Stripe-overeenkomst (alleen staff/admin): Stuur betaaluitnodiging, status, Open klantportaal, Pas nieuwe tarieven toe, Synchroniseer. In ontwikkelmodus ook "Test: start direct".
- **Landingspagina** `/direct-debit/start`: ongewijzigd werkend; de checkout weigert nu wel overeenkomsten die niet op Stripe staan.
- **Dubbel-betaalbeveiliging:**
  - Database-trigger: een batchregel voor een Stripe-overeenkomst wordt geweigerd.
  - Database-trigger: zet je een overeenkomst om naar Stripe, dan verdwijnt die uit concept-batches.
  - `generate-invoice` slaat regels van Stripe-overeenkomsten over.
  - `generate-sepa-xml` weigert een batch met Stripe-overeenkomsten.
  - `send-direct-debit-invite` en `create-subscription-checkout` weigeren niet-Stripe-overeenkomsten (409).
  - Tests: `tests/code/billing/paymentMethodPure.test.ts`.
- **Beveiliging:** terugkeerlink van `create-customer-portal` alleen naar https op eigen domeinen; anders `https://mcp.mplifi.nl/account/profile`.
- **Edge functions gecontroleerd:** alle zeven werken met het huidige datamodel. Gecorrigeerd: `send-direct-debit-invite` kende de niet-bestaande rol `teacher` als beheerder; nu `admin`, `site_admin` en `staff`.
- **Duo-lessen:** elke duo-leerling heeft een eigen overeenkomst en dus een eigen Stripe-abonnement.

## 3. Wat jullie nog moeten instellen om te testen

1. **Stripe Dashboard (testmodus):** iDEAL en SEPA Direct Debit aan; Customer portal aan.
2. **Webhook:** `https://<project-ref>.supabase.co/functions/v1/stripe-webhook` met de events uit `stripe-direct-debit.md` §8.
3. **Secrets in Supabase** (lovable-branch én productie): `STRIPE_SECRET_KEY` (sk_test_…) en `STRIPE_WEBHOOK_SECRET` (whsec_…).
4. **Prijzen:** per lessoort/duur/frequentie moeten `price_per_lesson_under_21_cents` en `price_per_lesson_adult_cents` gevuld zijn, anders kan het schema niet berekend worden.
5. **Supabase Auth:** de redirect-URL `…/direct-debit/start` moet toegestaan zijn (Auth → URL Configuration).

## 4. Testscenario

1. Overeenkomst met betaalmethode Stripe aanmaken en opslaan.
2. Op de overeenkomst: "Stuur betaaluitnodiging" → mail openen → iDEAL-testmachtiging.
3. Terug in de app: "Synchroniseer" → status Gepland/Actief.
4. Nieuwe incassobatch maken: de Stripe-overeenkomst staat er níet in.
