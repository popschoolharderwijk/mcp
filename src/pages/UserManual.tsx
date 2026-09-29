import { LuDatabase, LuShieldCheck } from 'react-icons/lu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NAV_ICONS, NAV_LABELS } from '@/config/nav-labels';

interface ManualSection {
	icon: React.ElementType;
	title: string;
	description: string;
	details: string[];
}

const sections: ManualSection[] = [
	{
		icon: NAV_ICONS.dashboard,
		title: NAV_LABELS.dashboard,
		description: 'Het dashboard is de startpagina na inloggen en toont alles wat vandaag aandacht vraagt.',
		details: [
			'Statistieken: aantal actieve leerlingen, docenten en lopende overeenkomsten in één oogopslag.',
			'Actiepunten: openstaande aanmeldingen, ontbrekende beschikbaarheid en ontbrekende incassomandaten.',
			'Recente leerlingen: de vijf meest recent aangemaakte leerlingen (gesorteerd op aanmaakdatum, nieuwste eerst) — klik door naar de leerlingenlijst.',
			'Docent beschikbaarheid: overzicht per docent van gekoppelde lessoorten en het aantal beschikbare tijdsblokken.',
			'Nieuwsberichten: actieve berichten voor jouw rol verschijnen bovenaan met titel, datum en eventuele afbeelding.',
			'Docenten en leerlingen zien een vereenvoudigde versie met alleen hun eigen relevante blokken.',
		],
	},
	{
		icon: NAV_ICONS.users,
		title: NAV_LABELS.users,
		description: 'Beheer alle gebruikers van het systeem: medewerkers, docenten en leerlingen.',
		details: [
			'Gebruikers aanmaken: voeg nieuwe gebruikers toe met e-mailadres, naam en telefoonnummer. Inloggen gebeurt passwordless via een magic link.',
			'Rollen toewijzen: kies Site Admin, Admin, Staff, Docent of Leerling. De rol bepaalt welke menu-items en functies zichtbaar zijn.',
			'Zoeken en filteren: doorzoek de gebruikerslijst op naam of e-mail, filter op rol.',
			'Gebruiker verwijderen: verwijdert de gebruiker inclusief gekoppelde docent-/leerlingprofielen (cascade).',
		],
	},
	{
		icon: NAV_ICONS.lessonTypes,
		title: NAV_LABELS.lessonTypes,
		description: 'Definieer de soorten lessen die de muziekschool aanbiedt.',
		details: [
			'Lessoort aanmaken: geef een naam, kleur, icoon en optionele beschrijving op.',
			'Groepsles: markeer een lessoort als groepsles voor lessen waarbij leerlingen samen één vaste groep vormen (zie Groepslessen).',
			'Duo-les: markeer een lessoort als "Duo" om aan te geven dat twee leerlingen samen één tijdslot delen. De wizard vraagt dan om twee leerlingen en maakt automatisch twee gekoppelde overeenkomsten aan.',
			'Opties: stel per lessoort beschikbare frequenties, duur (in minuten) en prijs per les in. Een lessoort kan meerdere opties hebben.',
			'Kostenplaats: koppel optioneel een kostenplaats voor de boekhouding.',
			'Actief/inactief: deactiveer een lessoort zodat deze niet meer gekozen kan worden voor nieuwe overeenkomsten of aanmeldingen.',
		],
	},
	{
		icon: NAV_ICONS.lessonGroups,
		title: NAV_LABELS.lessonGroups,
		description: 'Beheer vaste groepslessen en de leerlingen die eraan deelnemen.',
		details: [
			'Groepsles aanmaken: kies een lessoort dat als groepsles is gemarkeerd, een docent, dag/tijd en frequentie. Het systeem genereert automatisch agenda-events.',
			'Deelnemers: voeg leerlingen toe of verwijder ze; per groep is het aantal deelnemers zichtbaar.',
			'Verschil met duo-les: een groepsles is één afspraak voor een vaste groep; een duo-les bestaat uit twee individuele overeenkomsten die hetzelfde tijdslot delen.',
		],
	},
	{
		icon: NAV_ICONS.teachers,
		title: NAV_LABELS.teachers,
		description: 'Beheer het docentenbestand en hun beschikbaarheid.',
		details: [
			'Docenten overzicht: bekijk alle docenten met hun lessoorten en status.',
			'Docent toevoegen: koppel een bestaande gebruiker of maak direct een nieuwe aan.',
			'Lessoorten toewijzen: per docent aangeven welke lessoorten hij/zij geeft — alleen deze docenten verschijnen bij inplannen van die lessoort.',
			'Beschikbaarheid: per docent dagen en tijdsblokken instellen. Buiten deze blokken kan geen les of proefles ingepland worden.',
			'Agenda: bekijk de planning van een docent met lessen, projecten, afwijkingen en annuleringen.',
		],
	},
	{
		icon: NAV_ICONS.students,
		title: NAV_LABELS.students,
		description: 'Beheer leerlinggegevens en bekijk overeenkomsten en aanmeldingen.',
		details: [
			'Overzicht: doorzoek en filter op naam, lessoort of status. Kolommen "Overeenkomsten" en "Aanmeldingen" tonen het aantal per leerling.',
			'Doorklikken: klik op een naam of aantal om het leerlingdetail te openen.',
			'Detailpagina: van hieruit kun je doorklikken naar een specifieke overeenkomst of aanmelding.',
			'Leerling toevoegen: meestal automatisch via aanmelding of overeenkomst, handmatig kan ook.',
			'Gegevens bewerken: contactgegevens, geboortedatum (essentieel voor BTW-rapportage), ouder/verzorger en debiteurgegevens.',
			'Mijn profiel (leerlingportal): leerlingen zien hun eigen overeenkomsten en aanmeldingen via "Mijn profiel".',
		],
	},
	{
		icon: NAV_ICONS.signupRequests,
		title: NAV_LABELS.signupRequests,
		description:
			'Aanmeldingen die binnenkomen via het publieke aanmeldformulier en door staff worden verwerkt tot een lesovereenkomst.',
		details: [
			'Publiek formulier: leerlingen kiezen op de aanmeldpagina hun lessoort en daarna een optie (frequentie, duur, prijs).',
			'Verwerken: open een aanmelding en klik "Verwerken" — de overeenkomsten-wizard opent met leerling, lessoort en optie al ingevuld.',
			'Status: open, proefles ingepland, in behandeling, omgezet of afgewezen.',
			'Doorklikken: vanaf het leerlingdetail kun je rechtstreeks naar een aanmelding springen.',
			'Afwijzen: aanmeldingen die niet doorgaan kunnen worden afgewezen en verdwijnen uit de open lijst.',
		],
	},
	{
		icon: NAV_ICONS.trialLessons,
		title: NAV_LABELS.trialLessons,
		description:
			'Plan een vrijblijvende proefles bij een aanmelding. De aanmelding blijft "Open" tot er een overeenkomst is of de aanmelding wordt afgewezen.',
		details: [
			'Plannen: open een aanmelding en klik "Proefles". Kies uit beschikbare slots (vandaag t/m +30 dagen, 30 min per slot) met daarbij de docent.',
			'Beschikbaarheid: het systeem houdt rekening met de beschikbaarheid van docenten die de gekozen lessoort geven, al ingeplande lessen, bestaande proeflessen én lesvrije periodes.',
			'Mailbevestiging: leerling/aanmelder en docent ontvangen automatisch een mail (templates trial_scheduled en trial_scheduled_teacher, aanpasbaar via E-mailtemplates).',
			'Vervolg: na de proefles kan staff "Verwerken" tot lesovereenkomst, of "Afwijzen".',
			'Mijn proefles: leerlingen zien hun ingeplande proefles via "Mijn proefles" in het portal.',
		],
	},
	{
		icon: NAV_ICONS.agreements,
		title: NAV_LABELS.agreements,
		description: 'Lesovereenkomsten vastleggen en beheren via de overeenkomsten-wizard.',
		details: [
			'Nieuwe overeenkomst: doorloop vier stappen — leerling, lessoort + optie, docent + planning, bevestiging.',
			'Stap 1 – Leerling: kies een bestaande gebruiker of voeg een nieuwe toe. Bij een duo-lessoort kies je hier twee leerlingen.',
			'Stap 2 – Lessoort & optie: kies een lessoort en een optie (duur, frequentie, prijs). Bij verwerking van een aanmelding voorgevuld.',
			'Stap 3 – Docent & planning: selecteer een beschikbare docent, kies dag, starttijd en startdatum.',
			'Stap 4 – Bevestiging: controleer en bevestig.',
			'Duo-flow: bij een duo-lessoort maakt de wizard automatisch twee gekoppelde overeenkomsten via een edge function. In de agenda zien beide leerlingen hetzelfde slot met een duo-badge.',
			'Doorklikken: leerling- en docentnamen zijn klikbaar vanuit de wizard, de bevestigingspagina en het overzicht.',
			'Bewerken / beëindigen: open een overeenkomst om gegevens aan te passen of een einddatum te zetten; toekomstige lessen verdwijnen dan uit de agenda.',
		],
	},
	{
		icon: NAV_ICONS.invoices,
		title: NAV_LABELS.invoices,
		description:
			'Automatisch genereren, versturen en archiveren van facturen per incasso-batch. Iedere leerling krijgt één factuur per batch, met de juiste BTW-categorie en SEPA-verwijzing.',
		details: [
			'Stap 1 – Bedrijfsgegevens vullen: ga naar Instellingen → Boekhouding → "Bedrijfsgegevens & factuur" en vul bedrijfsnaam, adres, KvK, BTW-nummer, IBAN, e-mail en telefoon in. Stel ook factuurnummer-prefix (bv. INV-), startnummer, betalingstermijn (dagen) en optioneel een footertekst in. Zonder deze gegevens kan generate-invoice niet draaien.',
			'Stap 2 – Mandaten en batch klaarzetten: zorg dat de betreffende leerlingen een actief SEPA-mandaat hebben (Mandaten). Maak vervolgens via Incasso een nieuwe batch aan met collection date, en voeg per leerling één of meer batch-items toe (bedrag in centen + remittance-info).',
			'Stap 3 – Batch goedkeuren: open de batch-detailpagina en klik "Goedkeuren". Dit triggert automatisch de edge function generate-invoice met send_email: true.',
			'Stap 4 – Factuurnummer toekennen: generate-invoice roept next_invoice_number() aan; dit verhoogt atomair invoice_number_next en levert een nummer in het formaat {prefix}{jaar}-{volgnummer} (bv. INV-2026-00001).',
			'Stap 5 – BTW bepalen per regel: per batch-item kijkt het systeem naar de geboortedatum van de leerling op de collection date. <21 jaar → 0% BTW (vrijgesteld), ≥21 jaar → 21% BTW. Mist de geboortedatum, dan valt de regel in categorie "unknown" (behandeld als vrijgesteld). Een factuur met zowel vrijgestelde als belaste regels krijgt age_category "mixed".',
			'Stap 6 – PDF renderen: er wordt een A4-PDF in Mplifi-huisstijl (oranje merkkleur in de header) opgebouwd met bedrijfsblok, debiteurgegevens (of ouder/verzorger), factuurnummer, vervaldatum, regels met BTW-splitsing, totalen en het SEPA-mandaatreferentie.',
			'Stap 7 – Opslaan: de PDF wordt opgeslagen in de privé storage-bucket "invoices" onder pad {student_user_id}/{invoice_id}.pdf. De invoices-rij krijgt status "issued" plus pdf_storage_path.',
			'Stap 8 – Versturen: indien een Resend-API-key is geconfigureerd, wordt de PDF als bijlage gemaild naar ouder/verzorger of anders de leerling zelf. Bij succes worden sent_at en email_sent_to bijgewerkt.',
			'Stap 9 – Idempotent opnieuw draaien: een tweede call op dezelfde batch slaat bestaande facturen over (skipped: true). Veilig bij retries of bij toevoegen van nieuwe leerlingen aan een batch.',
			'Stap 10 – Inzage door admins: ga naar Facturen voor een doorzoekbaar overzicht van alle facturen (nummer, leerling, datum, bedrag, status). Klik op een rij om de PDF te downloaden via een tijdelijke signed URL (60 sec.).',
			'Stap 11 – Inzage door leerling: leerlingen openen "Mijn facturen" in het portal en zien uitsluitend hun eigen facturen (RLS afgedwongen op invoices en op de storage-bucket). Downloaden gebeurt via dezelfde signed URL-functie.',
			'Handmatige correctie: een factuur kan in de DB op status "cancelled" worden gezet; admins kunnen indien nodig een correctie-batch aanmaken (kind: correction) en opnieuw genereren.',
		],
	},
	{
		icon: NAV_ICONS.mandates,
		title: NAV_LABELS.mandates,
		description:
			'Beheer SEPA-incassomandaten waarmee de school lesgeld automatisch mag afschrijven van de rekening van de leerling of ouder/verzorger.',
		details: [
			'Aanmaken: voer IBAN, tenaamstelling en (optioneel) BIC in. Het systeem genereert automatisch een unieke mandaatreferentie (UMR) en zet het mandaat op status "pending".',
			'Uitnodigen: verstuur een mandaatuitnodiging per e-mail (template "direct_debit_invite") zodat de debiteur digitaal akkoord kan geven.',
			'Activeren: na akkoord wordt het mandaat "active" met een signature date; alleen actieve mandaten worden meegenomen in een incasso-batch.',
			'Intrekken: een mandaat kan handmatig op "revoked" gezet worden; toekomstige batches slaan de leerling dan over.',
			'Zichtbaarheid: staff/admin zien alle mandaten; leerlingen/ouders zien alleen hun eigen mandaat (afgedwongen via RLS).',
		],
	},
	{
		icon: NAV_ICONS.directDebit,
		title: NAV_LABELS.directDebit,
		description:
			'Bundel automatische incasso-opdrachten in batches, genereer een SEPA XML (pain.008) voor de bank en verwerk statusmeldingen (pain.002).',
		details: [
			'Batch aanmaken: kies een collection date, batch-type (first / recurring / final / one-off) en een omschrijving. De batch krijgt automatisch een uniek MessageId en PaymentInformationId.',
			'Batch-items: voeg per leerling één of meer regels toe met bedrag (in centen) en remittance-informatie (bv. "Lesgeld november 2026").',
			'Facturen genereren: bij goedkeuring van de batch worden per leerling automatisch facturen aangemaakt en gemaild (zie Facturen).',
			'SEPA XML exporteren: de knop "Genereer SEPA XML" roept de edge function generate-sepa-xml aan en levert een pain.008.001.08-bestand dat je uploadt in je bankportaal.',
			'Statusupdate importeren: upload het pain.002-terugmeldbestand van de bank via "Status importeren". De edge function import-sepa-status matcht per EndToEndId en zet items op paid / rejected inclusief reason code.',
			'Correctiebatches: bij storneringen kun je een batch met kind "correction" aanmaken zonder de originele factuur te raken.',
			'Toegang: alleen admin/site_admin. Alle acties zijn gelogd en idempotent (opnieuw uitvoeren maakt geen dubbele opdrachten).',
		],
	},
	{
		icon: NAV_ICONS.projects,
		title: NAV_LABELS.projects,
		description: 'Beheer projecten en plan afspraken voor docenten en leerlingen.',
		details: [
			'Overzicht: alle projecten met domein, label, eigenaar en status.',
			'Aanmaken: naam, label (gekoppeld aan een domein), eigenaar en optioneel een kostenplaats.',
			'Domeinen en labels: hiërarchie te beheren via Instellingen.',
			'Afspraak plannen: vanuit de projectpagina of de agenda; gekoppeld aan één of meer docenten en leerlingen.',
			'Deactiveren: zet een project op inactief zodat er geen nieuwe afspraken voor gepland worden; bestaande blijven staan.',
		],
	},
	{
		icon: NAV_ICONS.agenda,
		title: 'Agenda & afwijkingen',
		description: 'De agenda toont alle ingeplande lessen, groepslessen en projecten.',
		details: [
			'Weergave: per week of maand, voor jezelf of voor een geselecteerde docent (staff/admin).',
			'Bronnen: events komen uit lesovereenkomsten, groepslessen, projecten en losse handmatige afspraken.',
			'Duo-badge: bij duo-lessen toont het event een badge met het aantal leerlingen en beide namen.',
			'Project-events: krijgen een mapje-icoon en tonen de projectnaam.',
			'Handmatige events: losse afspraken met titel, beschrijving, kleur en deelnemers.',
			'Les verplaatsen: maak een afwijking aan, eenmalig of structureel.',
			'Les annuleren: enkele les of alle toekomstige in een reeks. Het type annulering (docent vs. leerling) bepaalt of de les wel/niet meetelt in de urenrapportage.',
			'Herhaling: afwijkingen eenmalig of herhalend, met optionele einddatum.',
		],
	},
	{
		icon: NAV_ICONS.noLessonPeriods,
		title: NAV_LABELS.noLessonPeriods,
		description: 'Beheer vakanties en andere lesvrije periodes voor de hele school of per docent.',
		details: [
			'Aanmaken: naam, startdatum, einddatum en optioneel een docent. Zonder docent geldt de periode school-breed.',
			'Effect op agenda: terugkerende lessen binnen de periode worden automatisch overgeslagen in agenda en rapportages.',
			'Proeflessen: lesvrije periodes blokkeren ook beschikbare proeflesslots.',
		],
	},
	{
		icon: NAV_ICONS.reports,
		title: NAV_LABELS.reports,
		description: 'Rapportages over lesuren, projecturen, leeftijdscategorieën en BTW.',
		details: [
			'Periode: voorgedefinieerd (deze maand, vorig kwartaal, ...) of handmatige start- en einddatum.',
			'Docentenfilter: filter op een specifieke docent (alleen beheerders).',
			'Samenvatting: totaal aantal uren, opgesplitst naar <21 (BTW-vrij) en 21+ (BTW-plichtig) op basis van leeftijd op de lesdatum.',
			'Detail per lessoort: aantal leerlingen, totaal uren en verdeling per leeftijdscategorie.',
			'Duo-rapportage: bij duo-lessen toont de rapportage twee rijen (één blok voor de docent, één les per leerling) zodat zowel doceeruren als verkochte lestijd kloppen.',
			'Annuleringen: lessen geannuleerd door de docent tellen niet, lessen geannuleerd door de leerling tellen wél als verkochte lestijd.',
			'Projecturen: per docent per project het aantal geplande uren binnen de periode.',
		],
	},
	{
		icon: NAV_ICONS.accounting,
		title: NAV_LABELS.accounting,
		description: 'Boekhoudrapport met omzet per lessoort, BTW-categorie en kostenplaats.',
		details: [
			'Periode kiezen: bepaalt welke gefactureerde maanden worden meegenomen.',
			'BTW-splitsing: omzet wordt automatisch verdeeld over de juiste BTW-categorie (vrijgesteld <21, belast 21+).',
			'Kostenplaatsen: omzet wordt per kostenplaats getotaliseerd (ingesteld op lessoort of project).',
			'Boekhoudinstellingen: standaard-grootboekrekeningen, BTW-codes en rapportage-opties beheer je via Instellingen → Boekhouding-instellingen.',
		],
	},
	{
		icon: NAV_ICONS.accountingSettings,
		title: NAV_LABELS.accountingSettings,
		description:
			'Centrale plek voor boekhoudkundige instellingen: bedrijfsgegevens, factuurnummering, grootboekrekeningen en BTW-codes.',
		details: [
			'Bedrijfsgegevens & factuur: bedrijfsnaam, adres, KvK, BTW-nummer, IBAN, contactgegevens, factuurnummer-prefix, startnummer, betalingstermijn en footertekst — vereist voor factuurgeneratie.',
			'Grootboekrekeningen: standaard-rekeningen per lessoort/BTW-categorie voor de Exact Online-export.',
			'BTW-codes: koppel per categorie (vrijgesteld <21, belast 21+) een BTW-code die in het boekhoudrapport terugkomt.',
			'Toegang: alleen admin/site_admin via Instellingen → Boekhouding-instellingen.',
		],
	},
	{
		icon: NAV_ICONS.dataImport,
		title: NAV_LABELS.dataImport,
		description: 'Eenmalige import van historische gegevens uit een Excel-bestand.',
		details: [
			'Template downloaden: gebruik het meegeleverde XLSX-sjabloon met tabbladen voor gebruikers, leerlingen, docenten en overeenkomsten.',
			'Upload: kies een ingevuld bestand en start de import vanuit Instellingen → Data-import. De verwerking loopt via de edge function import-legacy-data.',
			"Idempotent: de import gebruikt een aparte legacy_ids-tabel om externe id's te mappen op interne UUID's; opnieuw uploaden van hetzelfde bestand maakt geen duplicaten.",
			'Foutmeldingen: per rij wordt teruggegeven of de import is geslaagd — corrigeer in Excel en upload opnieuw.',
		],
	},
	{
		icon: NAV_ICONS.announcements,
		title: NAV_LABELS.announcements,
		description:
			'Publiceer korte nieuwsberichten die zichtbaar zijn op het dashboard van docenten en/of leerlingen.',
		details: [
			'Aanmaken: titel, bericht, doelgroep (docenten, leerlingen of beide) en optionele publicatiedatum.',
			'Afbeelding: upload optioneel een afbeelding (JPG, PNG, WEBP of GIF, max. 5 MB). Alleen Staff/Admin/Site Admin kan uploaden; afbeeldingen staan in de publieke storage-bucket "announcement-images".',
			'Actief / inactief: zet een bericht op inactief om het te verbergen zonder te verwijderen.',
			'Zichtbaarheid: verschijnt op het dashboard zodra het actief is, op of na de publicatiedatum, en de doelgroep matcht met de rol van de kijker.',
			'Beheer: Instellingen → Nieuwsberichten.',
		],
	},
	{
		icon: NAV_ICONS.emailTemplates,
		title: NAV_LABELS.emailTemplates,
		description: 'Pas de teksten van automatische e-mails aan zonder code te wijzigen.',
		details: [
			'Templates: o.a. proefles ingepland (leerling/docent), betaaluitnodiging, welkomstmail en mandaatbevestiging.',
			'Variabelen: gebruik placeholders zoals {{student_name}}, {{lesson_date}}, {{teacher_name}} — beschikbare variabelen staan per template vermeld.',
			'Onderwerp & body: pas onderwerp en HTML-inhoud apart aan. Een voorbeeldweergave toont het resultaat.',
			'Reset: knop "Herstel default" zet een template terug naar de standaardversie.',
		],
	},
	{
		icon: NAV_ICONS.myAvailability,
		title: 'Docent-portal',
		description: 'Functies die alleen zichtbaar zijn voor ingelogde docenten.',
		details: [
			'Mijn beschikbaarheid: stel je beschikbare dagen en tijdsblokken in; deze bepalen welke slots aan leerlingen worden aangeboden.',
			'Mijn leerlingen: leerlingen waarmee je een actieve overeenkomst hebt, inclusief contactgegevens.',
			'Mijn statistieken: persoonlijk overzicht van gegeven uren, aantal leerlingen en projecturen per periode.',
			'Agenda: jouw eigen planning met lessen, projecten en afwijkingen.',
		],
	},
	{
		icon: LuShieldCheck,
		title: 'Rollen & rechten',
		description: 'Het systeem kent verschillende rollen die bepalen wat een gebruiker kan zien en doen.',
		details: [
			'Site Admin: volledige toegang inclusief gebruikersbeheer, systeeminstellingen en incasso.',
			'Admin: alle beheersfuncties (gebruikers, lessoorten, docenten, leerlingen, overeenkomsten, rapportages, boekhouding, incasso, mandaten).',
			'Staff: leerlingen en docenten beheren, aanmeldingen verwerken, agenda bijhouden en rapportages inzien — geen boekhoud- of incasso-instellingen.',
			'Docent: eigen profiel, beschikbaarheid, leerlingen, agenda en statistieken.',
			'Leerling: eigen profiel, overeenkomsten, facturen en (indien van toepassing) ingeplande proefles.',
			'Rolopslag: rollen staan in een aparte tabel user_roles (één rol per gebruiker) om privilege-escalation te voorkomen; controle via de security-definer functie has_role.',
			'Inloggen: passwordless via magic link — gebruikers vragen een loginlink aan en klikken op de link in hun mail. Geen wachtwoorden, geen social login.',
		],
	},
	{
		icon: NAV_ICONS.accountProfile,
		title: 'Mijn account',
		description: 'Persoonlijke instellingen die elke ingelogde gebruiker zelf kan aanpassen.',
		details: [
			'Profiel: eigen naam, telefoonnummer en avatar bijwerken (avatars in de publieke storage-bucket "avatars", max. 5 MB).',
			'Weergave: schakel tussen licht, donker en systeem-thema; voorkeur wordt lokaal per browser opgeslagen.',
			'Account verwijderen: verwijdert het eigen account inclusief docent-/leerlingprofiel (cascade). Het laatste site_admin-account kan niet verwijderd worden (databasetrigger).',
		],
	},
	{
		icon: LuDatabase,
		title: 'Technische architectuur',
		description:
			'Achtergrond bij hoe POPschool intern werkt — handig voor beheerders en ontwikkelaars die de applicatie onderhouden of uitbreiden.',
		details: [
			'Frontend: React 18 + Vite + TypeScript, Tailwind CSS met een oranje huisstijl. UI-componenten uit shadcn/ui, iconen strikt uit react-icons/lu.',
			'Backend: externe Supabase Pro (geen Lovable Cloud) met branching. Development draait tegen de mcp-dev branch, productie via de Supabase GitHub-integratie.',
			'Autorisatie: alle tabellen hebben Row Level Security. Policies zijn PERMISSIVE en geconsolideerd; views draaien met security_invoker=on zodat RLS van de onderliggende tabellen geldt.',
			'Toegangscontrole: has_role(user, role) en dedicated helpers (bv. is_project_teacher, is_project_participant) worden zowel in policies als in RPC-functies gebruikt.',
			'RPC-functies: paginatie via get_students_paginated / get_teachers_paginated / get_users_paginated / get_lesson_agreements_paginated. Rapportage via get_hours_report (CTE-gebaseerd, polymorfe agenda-bron).',
			'Agenda: polymorfe events met source_type + source_id (lesson_agreement, lesson_group, project, manual). Meerdere deelnemers via agenda_participants. Afwijkingen en annuleringen zitten in agenda_event_deviations, met onderscheid tussen docent- en leerling-annulering voor de urenrapportage.',
			'Duo-lessen: aparte edge function create-duo-agreements maakt twee gekoppelde overeenkomsten in één transactie. Rapportage toont twee rijen (docentblok + les per leerling).',
			'BTW-logica: leeftijd wordt berekend op basis van geboortedatum leerling versus lesdatum/collection date — <21 vrijgesteld, ≥21 belast. Onbekende geboortedatum → categorie "unknown", factuur met gemengde regels krijgt "mixed".',
			'Facturen & incasso: edge functions generate-invoice, generate-sepa-xml en import-sepa-status. Facturen staan als PDF in de privé storage-bucket "invoices"; downloads via kortstondige signed URLs (60 sec).',
			'E-mail: alle transactionele mails lopen via de edge function send-template-email (Resend). Templates staan in email_templates en zijn per project aanpasbaar. De helper sendTemplateEmail wordt hergebruikt vanuit meerdere functies (schedule-trial-lesson, submit-signup-request, create-duo-agreements, ...).',
			'Migraties: elke schemawijziging staat als bestand in supabase/migrations/ (logische Nederlandse naam). Na een migratie regenereert bun run reset-db:dev de TypeScript-types in src/integrations/supabase/types.ts.',
			'CI/CD: aparte workflows voor formattering (Biome), linting, unit-tests en RLS-testsuite. RLS-tests draaien tegen een Supabase Preview branch met een impersonatie-helper (signInAs) om echte rolgedrag te verifiëren.',
			'Ontwikkelrichtlijnen: geen LLM/AI-componenten, geen Radix UI, TanStack Query of React Hook Form; wél DataTable, PageSkeleton, SectionSkeleton, en verplicht Biome-format vóór commit.',
		],
	},
];

export default function UserManual() {
	return (
		<div className="space-y-6">
			<div className="grid gap-6">
				{sections.map((section) => (
					<Card key={section.title}>
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center gap-2 text-lg">
								<section.icon className="h-5 w-5 text-primary" />
								{section.title}
							</CardTitle>
							<p className="text-sm text-muted-foreground">{section.description}</p>
						</CardHeader>
						<CardContent>
							<ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground">
								{section.details.map((detail) => (
									<li key={detail}>{detail}</li>
								))}
							</ul>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
