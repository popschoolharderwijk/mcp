# Stripe: huidige status en heractivering

Leesbare uitleg van hoe Stripe nu in de app zit en wat er nodig is om het weer te gebruiken. De technische details staan in `stripe-direct-debit.md`.

## 1. Kort samengevat

- Alle betalingen lopen nu via **eigen SEPA-incasso** (mandaten, incassobatches, XML-bestand voor de bank) en **eigen facturen** (PDF, zichtbaar onder Financiën → Facturen en Mijn facturen).
- Stripe is **niet verwijderd, maar uitgeschakeld in de interface**. De techniek erachter (database-tabellen, edge functions, webhook) bestaat nog.
- Er is **geen schakelaar** in de app om Stripe aan of uit te zetten.

## 2. Wat er nog wél is

| Onderdeel | Status |
|---|---|
| Tabellen `stripe_customers`, `subscriptions`, `subscription_invoices`, `direct_debit_invitations` | Aanwezig, worden niet meer gevuld |
| Edge functions `send-direct-debit-invite`, `create-subscription-checkout`, `create-customer-portal`, `sync-stripe-subscription`, `rebuild-subscription-schedule`, `force-start-subscription`, `stripe-webhook` | Aanwezig in de code |
| Gedeelde logica `supabase/functions/_shared/billing.ts` en `stripe.ts` | Aanwezig |
| Pagina `/direct-debit/start` (landingspagina na betaaluitnodiging) | Aanwezig, maar niemand krijgt er nog een link naartoe |
| Waarde `'stripe'` in betaalmethode van een overeenkomst | Bestaat in de code en database, maar is niet kiesbaar |
| `accounting_settings.payment_provider` (`stripe` of `sepa`) | Alleen gebruikt bij de boekhoudexport om het juiste bankrekeningnummer te kiezen (`src/lib/accounting/exporters.ts`) |
| Secrets `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Staan (mogelijk nog) in de Supabase-secrets |

## 3. Wat er is weggehaald

- De **Abonnement/Stripe-kaart** op de overeenkomst (knop "Stuur betaaluitnodiging", status, "Open klantportaal", "Pas nieuwe tarieven toe", "Synchroniseer").
- De optie **Stripe** in de overeenkomst-wizard. Nu alleen: *SEPA-incasso* en *Handmatig / op factuur*.
- Overige zichtbare Stripe-knoppen en -badges.

## 4. Stripe weer activeren — stappenplan

### Stap 1 — Besluit
Kies of Stripe **naast** SEPA komt (per overeenkomst kiezen) of SEPA **vervangt**. Let op: met Stripe maakt Stripe zelf facturen; de eigen facturen in de app worden dan niet aangemaakt voor die overeenkomsten. Dubbel factureren moet voorkomen worden.

### Stap 2 — Stripe Dashboard
1. Betaalmethoden **iDEAL** en **SEPA Direct Debit** aanzetten.
2. **Customer portal** aanzetten (betaalmethode wijzigen, facturen bekijken, opzeggen).
3. **Webhook** registreren op `https://<project-ref>.supabase.co/functions/v1/stripe-webhook` met de events uit `stripe-direct-debit.md` §8.
4. Eerst in **testmodus**, daarna live.

### Stap 3 — Secrets
In Supabase (per omgeving/branch) controleren of invullen:
- `STRIPE_SECRET_KEY` (sk_test_… of sk_live_…)
- `STRIPE_WEBHOOK_SECRET` (whsec_… uit de webhook-instelling)

Nooit met `VITE_`-prefix, nooit in de frontend.

### Stap 4 — Edge functions controleren en deployen
Controleren dat de zeven Stripe-functions gedeployed zijn en werken met het huidige datamodel (er is sindsdien veel veranderd: duo-lessen, facturen, mandaten).

### Stap 5 — Interface terugzetten (ontwikkelwerk)
- Optie **Stripe** terug in de betaalmethode-keuze van de overeenkomst-wizard (`PaymentMethodOptions.tsx`).
- De **Abonnement-kaart** terug op de overeenkomst (uit git-historie, commit `e615c88`).
- Eventueel een echte **schakelaar "Betaalmethode: SEPA / Stripe"** in Boekhouding-instellingen, gekoppeld aan `accounting_settings.payment_provider`.
- Voorkomen dat overeenkomsten met betaalmethode Stripe in SEPA-incassobatches en eigen facturen terechtkomen.

### Stap 6 — Beveiliging
Openstaand punt uit de securityscan: de terugkeerlink van het klantportaal (`create-customer-portal`) moet beperkt worden tot eigen domeinen. Oplossen vóór livegang.

### Stap 7 — Testen
1. Overeenkomst met betaalmethode Stripe aanmaken.
2. Betaaluitnodiging versturen → link openen → iDEAL-testbetaling.
3. Controleren: abonnement verschijnt met status *scheduled/active*, webhook-events komen binnen, factuur in Stripe.
4. Controleren dat dezelfde overeenkomst **niet** in een SEPA-batch komt.

### Stap 8 — Handleiding bijwerken
De handleiding (`/manual`) beschrijft nu alleen SEPA. Stripe-deel toevoegen bij heractivering.

## 5. Inschatting
Stap 2–3: beheerwerk, ongeveer een uur. Stap 4–7: ontwikkelwerk, afhankelijk van hoeveel de edge functions zijn verouderd; reken op enkele dagdelen inclusief testen.
