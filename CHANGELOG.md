# Changelog

## 1.0.0 — 2026-09-15

- Eerste live test voor gebruikers

## 0.8.0 — 2026-07-25

- Versienummer zichtbaar in het gebruikersmenu; klik opent dit changelog
- Database-seeds opgesplitst (bootstrap + test) en migraties geconsolideerd
- Extra beveiliging: strengere RLS, minder uitvoerrechten op functies, hardening-tests
- Codekwaliteit en tooling: Fallow, Bun-upgrade, opschoning van types en componenten

## 0.7.0 — 2026-07-02

- Legacy-import voor bestaande leerling- en lesgegevens
- Accountpagina en heringericht instellingenmenu
- VOG-verloopdatum bijhouden
- Nieuwsectie op het dashboard
- Boekhoudingsrapport en verbeterde rapportagelabels

## 0.6.0 — 2026-06-22

- Factuurgeneratie met bijbehorende instellingen
- SEPA-incasso: batches, mandaten en geautomatiseerde verwerking
- Submenu **Financiën** (facturatie en gerelateerde flows)
- Overeenkomsten per e-mail versturen
- Betaalmethode bevestigen in de wizard; opslag voor factuurbijlagen

## 0.5.0 — 2026-06-08

- Lesvrije periodes plannen en zichtbaar in de agenda
- Proeflessen: aanvraag, planning en status
- Duo-lessen (flow, badges in de agenda, correcte totalen)
- Abonnementsoverzicht, prijzen per lesfase en midjaar-prijsaanpassing
- Vakantieverschuiving van lessen

## 0.4.0 — 2026-05-12

- Stripe-integratie (eigen keys): checkout, webhooks en klantportal
- SEPA Direct Debit als betaalmethode
- Abonnementen koppelen, syncen en starten vanuit overeenkomsten
- Magic-link login en verbeterde auth-redirects
- Incasso-flow van preview tot afronding

## 0.3.0 — 2026-05-06

- Groepsbeheer en groepsles-wizard
- Aanmeldingen: inbox, koppeling aan leerlingen en zichtbaarheid in het portal
- Indicatoren en leerlingbadges bij groepslessen
- Profielmenu voor leerlingen; dashboard voor leerlingen aangepast
- Docent- en leerlingfilters op lessoort in de wizards

## 0.2.0 — 2026-03-30

- Annuleren van lessen (typen, dialoog en agenda-acties), ook per deelnemer
- Agenda: soepeler slepen/plaatsen, bredere rechten voor admins
- Dashboard met echte cijfers voor admin en staf
- Beschikbaarheidsslots bewerken

## 0.1.0 — 2026-03-20

- Inloggen, registreren en gebruikersbeheer (rollen, role switcher, dev-login)
- Overzichten voor gebruikers, docenten en leerlingen (paginering en sortering)
- Lessoorten met opties (duur, frequentie, prijs)
- Lesovereenkomsten
- Agenda voor docenten (afspraken, leerlinginfo)
- Projecten (eerste versie)
- Rapportages (eerste versie)
