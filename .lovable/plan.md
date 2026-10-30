# Gezondheidscheck Stripe-flow mcp-dev (30 oktober 2026, alleen gelezen)

Er is niets gewijzigd. Bewijs komt uit alleen-lezen queries op mcp-dev (`zdvscmogkfyddnnxzkdu`), de lijst met secrets en de logs van de functies.

## A. Instellingen
1. **Edge-secrets: NIET OK**
   - Aanwezig: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL`, `RESEND_API_KEY_TRANSACTIONAL` en `RESEND_FROM_EMAIL`. De code gebruikt deze namen, niet `RESEND_API_KEY`.
   - **`CRON_SECRET` ontbreekt** bij de edge-secrets. `stripe-billing-daily` leest die waarde wel uit.
   - Test- of live-modus van de Stripe-sleutel: ONBEKEND. Ik kan de waarde niet zien en mag hem niet uitlezen.
2. **Vault en cronjob: DEELS**
   - De job `stripe-billing-daily` bestaat, staat aan (`0 3 * * *`) en stuurt `x-cron-secret` mee uit Vault.
   - Of `CRON_SECRET` in Vault staat: ONBEKEND. Ik heb geen toegang tot Vault.
   - De runs van 28, 29 en 30 oktober staan op "succeeded". Dat betekent alleen dat het verzoek is verstuurd.
   - In `net._http_response` staat nog alleen het antwoord van 21 oktober: **401 Unauthorized**. Nieuwere antwoorden zijn al opgeruimd.
   - Zonder het edge-secret geeft de functie hoe dan ook 401. **De dagelijkse taak werkt dus waarschijnlijk niet.**
3. **accounting_settings: OK**
   - Btw-tarief 21% en vrijgesteld zijn ingevuld, net als de portaalconfiguratie.
   - Opzegtermijn: 30 dagen. Betaalprovider: stripe.
   - Laatste volledige sync: 30 oktober, 10:28 UTC.
4. **Bestaan deze objecten echt in Stripe: ONBEKEND.** Dat kan ik niet controleren zonder Stripe aan te roepen. Indirect bewijs: de sync van 10:28 is gelukt en heeft alle 24 producten op `in_sync` gezet.
5. **Webhook: ONBEKEND.** Er zijn geen logs van `stripe-webhook` beschikbaar. De analytics-logs sinds 27 oktober zijn leeg en de functielogs tonen niets. Er zijn ook geen sporen in de data: 0 abonnementen en 0 abonnementsfacturen.

## B. Gegevens
6. **Aantallen**
   - Lesvormen: 27, waarvan 24 met een tarief.
   - Stripe-catalogus: 24 producten (allemaal `in_sync`, geen fouten) en 41 actieve prijzen.
   - Overeenkomsten: 68 via Stripe, 24 via SEPA, 8 op factuur.
   - Abonnementen 0, abonnementsfacturen 0, betaallinks 0, linkaanvragen 0, uitnodigingen 0.
   - Het overzicht "Wacht op machtiging": ONBEKEND. De beheerweergave weigert een query zonder ingelogde gebruiker. Naar verwachting staan daar de 68 Stripe-overeenkomsten, voor zover het geen groepslessen zijn.
7. **Problemen in data: OK**
   - Geen Stripe-overeenkomsten zonder lesvorm, en geen zonder geboortedatum waar dat nodig is.
   - Geen abonnementen met `needs_rebuild` of rebuild-fouten, geen mislukte eerste facturen, geen dubbele open abonnementen. Er zijn ook nog geen abonnementen.
8. **Reset en migraties: OK**
   - Alle profielen zijn aangemaakt op 27 oktober om 12:10:27, dus de database is daarna niet opnieuw gereset.
   - In de database staan 39 migraties, gelijk aan de 39 bestanden in de repo. De nieuwste is `20261022072321`.
   - De 24 SEPA-overeenkomsten zijn testdata uit de seed.

## C. Werking
9. **Logs per functie: ONBEKEND.** Voor alle gevraagde functies geven de functielogs en de analytics-logs sinds 27 oktober niets terug. Ik kan dus geen aantallen of foutmeldingen geven, ook niet voor "Invalid token". Het enige werkende spoor is de geslaagde catalogus-sync van vandaag.
10. **Volledige keten: NEE.** Er zijn 0 betaallinks, 0 abonnementen en 0 Stripe-facturen. De stap van overeenkomst naar mail met betaallink is in deze database nooit gelukt.
    - Dat er 0 betaallinks zijn terwijl er 68 Stripe-overeenkomsten bestaan, past bij seed-data: geseede overeenkomsten krijgen geen mail.
    - Het kan ook betekenen dat de mail bij nieuwe overeenkomsten mislukt. Een link wordt pas opgeslagen na geslaagde verzending.

## D. Conclusie, in volgorde van belang
**Werkt:** schema compleet, tarieven, Stripe-catalogus en btw-tarieven gesynchroniseerd, portaalconfiguratie ingevuld, data zonder fouten.

**Werkt niet:**
1. `CRON_SECRET` ontbreekt bij de edge-secrets. De dagelijkse Stripe-taak krijgt daardoor 401. Er worden dan geen maandschema's bijgewerkt en geen achterstallige eerste facturen uitgegeven.
2. Er is nog nooit een volledige betaalketen geweest: geen betaallinks en geen abonnementen.

**Moet jij instellen of testen:**
1. Voeg `CRON_SECRET` toe aan de edge-secrets van mcp-dev, met **dezelfde waarde** als `CRON_SECRET` in Vault. Bestaat die in Vault nog niet, zet hem dan op beide plekken.
2. Controleer in het Stripe-dashboard dat de webhook naar `https://zdvscmogkfyddnnxzkdu.supabase.co/functions/v1/stripe-webhook` wijst. Het signing secret moet gelijk zijn aan `STRIPE_WEBHOOK_SECRET`, en de sleutel moet een testsleutel zijn.
3. Test de keten één keer: maak een nieuwe Stripe-overeenkomst met je eigen e-mailadres, controleer de mail en de knop "Machtiging afgeven", machtig met iDEAL (test) en kijk of het abonnement met schema en eerste factuur verschijnt.
4. Stuur de foutmelding als iets misgaat. De logs geven op dit moment niets terug, dus ik kan fouten niet achteraf terugvinden.

## Mogelijke vervolgstap, na jouw akkoord
- Geen codewijziging nodig voor punt 1; die instelling doe je zelf.
- Optioneel: na jouw test van de keten de logs en tabellen opnieuw nalopen en de uitkomst vastleggen in `docs/integrations/`.
