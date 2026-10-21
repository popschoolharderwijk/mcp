# Changelog

## 1.5.3 — 2026-10-21

- Mijn facturen toont Stripe-facturen naast eigen Mplifi-facturen, met status, datum, bedrag en knoppen voor openen of PDF downloaden; ook de losse eerste maand is zichtbaar.
- Bestaande toegangsregels blijven gelden; laadfouten krijgen een melding en een knop om opnieuw te proberen.

## 1.5.2 — 2026-10-20

- **Zelfherstel na een andere Stripe-sleutel**: "Synchroniseer met Stripe" controleert opgeslagen btw-tarieven, klantportaalconfiguratie, producten en prijzen in het huidige Stripe-account en maakt ontbrekende opnieuw aan; een tweede sync verandert niets
- Ontbreekt een btw-tarief, prijs of product bij het opbouwen van een abonnement of de eerste factuur, dan krijg je de melding "synchroniseer eerst met Stripe" in plaats van een Stripe-fout
- Klanten zien op de machtigingspagina nooit meer een ruwe Stripe-melding; de technische fout staat bij het abonnement op de overeenkomst ("Laatste fout")
- Mislukt het opbouwen na een afgegeven machtiging, dan herstelt "Synchroniseer" op de overeenkomst (of de dagelijkse taak) het abonnement zonder nieuwe machtiging

## 1.5.1 — 2026-10-20

- **Eigen betaaluitnodiging (Stripe)**: nieuwe e-mailtemplate "Betaaluitnodiging (Stripe)" (`direct_debit_invite`) met uitleg over de machtiging, het maandbedrag, de eerste maand naar rato, de startdatum en de minimale looptijd; beheerbaar onder Instellingen → E-mailtemplates
- De inloglink wordt op de server gemaakt (token_hash-formaat), zodat mailscanners hem niet vooraf verbruiken; geen algemene Supabase-inlogmail meer voor de uitnodiging

## 1.5.0 — 2026-10-20

- **Tarieven exact volgens de tarievenlijst** per 1 september 2026; verzonnen tarieven opgeruimd (instrumentlessen alleen 30 min wekelijks/tweewekelijks, Bandcoaching op 60 min tweewekelijks)
- **Stripe-abonnementen op de catalogus**: bedragen exact gelijk aan het tarief, btw per regel (vrijgesteld of 21% inclusief)
- Eerste maand naar rato als losse factuur op de startdatum; afschrijving daarna op de 1e van de maand
- Nooit afschrijven in augustus (factuur van € 0); 21+-tarief en tariefwijzigingen gaan automatisch in
- Opzeggen zet het einde direct in Stripe; opzeggen in het klantportaal staat uit
- Knop "Controleer abonnementen" onder Boekhouding-instellingen
- Dagelijkse taak houdt abonnementen bij
- Wizard: Stripe is de standaard; SEPA is niet meer kiesbaar voor nieuwe overeenkomsten
- E-mails tonen het maandbedrag (of eenmalig bedrag) in plaats van de prijs per les
- Prijs per les en prijs per deelnemer verwijderd (ook uit de import van oude gegevens)

## 1.4.0 — 2026-10-20

- **Stripe-catalogus**: lesvormen en tarieven staan automatisch in Stripe (product per lesvorm, prijzen onder 21 en 21+ per ingangsdatum, groepslessen eenmalig)
- Synchronisatie na opslaan in Lessoorten; opslaan mislukt nooit door Stripe
- Overzicht en knop "Synchroniseer met Stripe" onder Boekhouding-instellingen
- Btw-tarieven "Btw 21%" (inclusief) en "Btw vrijgesteld" worden eenmalig automatisch in Stripe aangemaakt
- Boekhouding-instellingen staan nu in het menu
- Minimale looptijd loopt tot het einde van de maand (start 15 oktober → 30 april)

## 1.3.0 — 2026-10-20

- **Tariefmodel**: lesgeld is een vast maandbedrag per lesvorm (11x per schooljaar, nooit in augustus), voor SEPA, Stripe en handmatig
- Per lesvorm een bedrag onder 21 en 21+ (incl. btw), met ingangsdatum; tariefwijzigingen gaan automatisch in
- 21+-tarief vanaf de maand na de 21e verjaardag; eerste maand naar rato
- Geboortedatum verplicht bij SEPA en Stripe; in de wizard in te vullen
- Looptijd: eerste 6 maanden, daarna per schooljaar; knop "Opzeggen" met instelbare opzegtermijn
- Incassoregels en facturen bevatten de btw-uitsplitsing uit het tariefmodel
- Groepslessen (8 lessen) eenmalig, in de incasso van de startmaand

## 1.2.0 — 2026-10-13

- **Stripe** weer beschikbaar als betaalmethode, naast SEPA-incasso en handmatig
- Kaart "Abonnement via Stripe" op de overeenkomst: betaaluitnodiging, status, klantportaal, nieuwe tarieven, synchroniseren
- Beveiliging tegen dubbel betalen: Stripe-overeenkomsten komen niet in SEPA-batches of eigen facturen
- Terugkeerlink van het Stripe-klantportaal beperkt tot eigen domeinen
- Medewerkers (staff) kunnen weer betaaluitnodigingen versturen

## 1.1.1 — 2026-10-06

- Leerlingdetail met tabbladen
- Namen en contactgegevens automatisch opgeschoond
- Meerdere UI verbeteringen

## 1.1.0 — 2026-09-29

- Nieuwe **Mplifi**-huisstijl: logo, favicon en gouden merkkleur
- Overzichtspagina's met vaste kop, korte toelichting

## 1.0.1 — 2026-09-15

- Dashboard voor **docenten** en **leerlingen**
- Verschillende kleine UI aanpassingen

## 1.0.0 — 2026-09-15

- Eerste live versie voor gebruikers

## 0.8.0 — 2026-07-25

- Versienummer zichtbaar in het gebruikersmenu; klik opent dit changelog

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

- Online betalen en abonnementen via Stripe
- SEPA-incasso (automatische afschrijving) als betaalmethode
- Abonnementen koppelen en beheren vanuit overeenkomsten
- Inloggen via magic link (link per e-mail, geen wachtwoord)
- Incasso-flow van uitnodiging tot afronding

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

- Inloggen en gebruikersbeheer (rollen)
- Overzichten voor gebruikers, docenten en leerlingen (paginering en sortering)
- Lessoorten met opties (duur, frequentie, prijs)
- Lesovereenkomsten
- Agenda voor docenten (afspraken, leerlinginfo)
- Projecten (eerste versie)
- Rapportages (eerste versie)
