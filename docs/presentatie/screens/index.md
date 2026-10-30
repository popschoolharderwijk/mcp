# Screenshots Stripe-flow (mcp-dev, 30 oktober 2026)

Viewport 1440×900, JPEG kwaliteit 70, opgeslagen als base64. Terugzetten: `base64 -d NN-naam.jpg.b64 > NN-naam.jpg`. Er is niets opgeslagen of verstuurd.

| Bestand | Wat staat erop | Rol |
|---|---|---|
| 01-aanmelden-start.jpg.b64 | Openbaar aanmeldformulier, stap 1: lessoort kiezen | uitgelogd |
| 02-aanmelden-lesvorm.jpg.b64 | Stap 2: duur, frequentie en prijs (Gitaarles) | uitgelogd |
| 03-aanmelden-betaling-fonds.jpg.b64 | Stap 3 met nepgegevens: uitleg over betalen via iDEAL en het vinkje "Ik betaal via een fonds" (niet ingediend) | uitgelogd |
| 04-aanmeldingen.jpg.b64 | Overzicht van aanmeldingen met de knoppen Proefles en Verwerken | beheerder (site-admin) |
| 05-verwerken-wizard-start.jpg.b64 | Na "Verwerken": wizard Nieuwe overeenkomst, stap Leerling (velden niet vooraf ingevuld in de preview) | beheerder |
| 06-wizard-leerling-lesvorm.jpg.b64 | Bestaande Stripe-overeenkomst, wizardstap Leerling en lesvorm | beheerder |
| 07-wizard-periode.jpg.b64 | Wizardstap Periode | beheerder |
| 08-overeenkomst-abonnement-stripe.jpg.b64 | Overzichtsstap: betaalmethode Stripe, lesgeld (eerste maand naar rato, maandbedrag, tarief, looptijd) en de kaart "Abonnement via Stripe" met "Opnieuw versturen" | beheerder |
| 09-wacht-op-machtiging.jpg.b64 | Financiën → Wacht op machtiging | beheerder |
| 10-beheerdashboard.jpg.b64 | Dashboard met de teller "64 overeenkomsten wachten op een machtiging" | beheerder |
| 11-leerlingdashboard.jpg.b64 | Dashboard van een leerling met de melding "Rond je betaling af" en de knop Machtiging afgeven | klant (student-010) |
| 12-betaalpagina-zonder-link.jpg.b64 | Betaalpagina met ongeldige link: formulier "Stuur me een nieuwe link" | uitgelogd |
| 13-boekhouding-stripe.jpg.b64 | Boekhouding-instellingen: opzegtermijn en Stripe-catalogus met "Synchroniseer met Stripe" | beheerder |
| 14-emailtemplates.jpg.b64 | Lijst met e-mailtemplates | beheerder |

## Niet gelukt of afwijkend
- **Badge "Wacht op machtiging" op de overeenkomst**: niet te zien op de detailpagina. Op de kaart staat "Status: Nog geen abonnement".
- **Knop "Controleer abonnementen"**: niet gevonden op de pagina Boekhouding-instellingen.
- **Detail van één aanmelding**: er is geen aparte detailpagina. "Verwerken" opent direct de wizard. De vooraf ingevulde velden verschenen niet in de preview.
- **Wizardstap met betaalmethode en bedragen**: vastgelegd bij een bestaande overeenkomst (08), niet bij een nieuwe, want daarvoor moet je opslaan.
- **Overeenkomst met een actief abonnement**: overgeslagen, want er zijn 0 abonnementen op mcp-dev.
- Betaalpagina zonder parameters (`/direct-debit/start`) geeft "Ongeldige uitnodigingslink". Het formulier verschijnt alleen bij een link met een ongeldige token (12).
