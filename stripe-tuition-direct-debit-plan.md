# Plan: Stripe Lesgeld-Incasso (v2) — HISTORISCH DOCUMENT

> 📌 **Dit is een historisch planningsdocument (12 mei 2026).** Het beschrijft de oorspronkelijke aanpak en bevat verouderde details. Voor de actuele technische beschrijving van de Stripe-incassoflow, zie:
>
> **→ [docs/integrations/stripe-direct-debit.md](docs/integrations/stripe-direct-debit.md)**
>
> Belangrijkste afwijkingen t.o.v. de actuele implementatie:
>
> - **Lesvrije periodes**: het plan ging uit van "skip" (lessen vervallen); de huidige implementatie gebruikt **verschuif-logica** (`src/lib/billing/calculateYearlyAmount.ts`) — lessen schuiven door met de lengte van de periode. Augustus blijft wél skip.
> - **`subscription_schedule_phases` tabel**: nooit aangemaakt; de schedule-fases worden direct uit `_shared/billing.ts` opgebouwd en niet apart gemirrored.
> - **Webhook trigger**: schedule wordt aangemaakt bij `setup_intent.succeeded` (niet bij `checkout.session.completed`).
> - **Extra edge functions toegevoegd**: `create-customer-portal`, `sync-stripe-subscription`, `rebuild-subscription-schedule`, `force-start-subscription`, `send-template-email`, `send-direct-debit-invite`.
> - **Extra tabellen toegevoegd**: `incasso_invitations`, `accounting_settings`, `email_templates`.

---

_Onderstaande inhoud is bewaard voor historische context. Wijzig niet — werk in plaats daarvan `docs/integrations/stripe-direct-debit.md` bij._

## Doel
Maandelijkse SEPA-incasso van lesgeld via Stripe, gespreid over **11 maanden per jaar** (augustus overslaan), op basis van een prijs per les en de frequentie van de lessen per leerling.

## Kernontwerp (origineel plan)

### Prijzen per les
Opgeslagen op `lesson_type_options`, uitgebreid met twee leeftijdstarieven (<21 en 21+). ✅ Geïmplementeerd.

### Schooljaar
1 september → 31 juli (11 incassomaanden, augustus pauze). ✅ Geïmplementeerd.

### Berekening jaarbedrag
- `yearlyCents = lessonsCount × pricePerLessonCents`
- `monthlyCents = floor(yearlyCents / 11)` met restbedrag in laatste maand

Implementatie wijkt af: gebruikt **verschuif-logica** voor `no_lesson_periods` i.p.v. simpele skip.

### Stripe Subscription Schedule
11 phases per jaar (sept t/m juli), augustus pauze. ✅ Geïmplementeerd in `_shared/billing.ts`.

### Beslissingen (origineel, nog geldig)
- ✅ Augustus overslaan via Schedule phases
- ✅ Beide flows: Checkout én direct activeren op bestaand mandaat
- ✅ Prijswijzigingen: vanaf volgende incassomaand, geen proration
- ✅ Leeftijdsbepaling per `lessonDate` (afwijking van origineel: niet per fase-startdatum)
- ✅ Schooljaar: 1 september – 31 juli
