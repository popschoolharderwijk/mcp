import { LuDatabase, LuShieldCheck } from 'react-icons/lu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NAV_ICONS, NAV_LABELS } from '@/config/nav-items';

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
			'Actiepunten: openstaande aanmeldingen en ontbrekende beschikbaarheid.',
			'Recente leerlingen: de vijf meest recent aangemaakte leerlingen (gesorteerd op aanmaakdatum, nieuwste eerst) — klik door naar de leerlingenlijst.',
			'Docent beschikbaarheid: overzicht per docent van gekoppelde lessoorten en het aantal beschikbare tijdsblokken.',
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
			'Kostenplaats: koppel optioneel een kostenplaats voor rapportages.',
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
			'Mailbevestiging: leerling/aanmelder en docent ontvangen automatisch een mail (templates trial_scheduled en trial_scheduled_teacher, aanpasbaar via Instellingen → E-mailtemplates).',
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
			'Betaling: lesgeld loopt via Stripe (iDEAL-setup → maandelijkse betaling). Stuur vanuit de overeenkomst een betaaluitnodiging; de leerling koppelt een betaalmethode via Checkout.',
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
			'Samenvatting: totaal aantal uren, opgesplitst naar jongeren (BTW-vrij) en volwassenen (BTW-plichtig) op basis van leeftijd op de lesdatum.',
			'Detail per lessoort: aantal leerlingen, totaal uren en verdeling per leeftijdscategorie.',
			'Duo-rapportage: bij duo-lessen toont de rapportage twee rijen (één blok voor de docent, één les per leerling) zodat zowel doceeruren als verkochte lestijd kloppen.',
			'Annuleringen: lessen geannuleerd door de docent tellen niet, lessen geannuleerd door de leerling tellen wél als verkochte lestijd.',
			'Projecturen: per docent per project het aantal geplande uren binnen de periode.',
		],
	},
	{
		icon: NAV_ICONS.announcements,
		title: NAV_LABELS.announcements,
		description: 'Beheer korte nieuwsberichten voor docenten en/of leerlingen.',
		details: [
			'Aanmaken: titel, bericht, doelgroep (docenten, leerlingen of beide) en optionele publicatiedatum.',
			'Afbeelding: upload optioneel een afbeelding (JPG, PNG, WEBP of GIF, max. 5 MB). Alleen Staff/Admin/Site Admin kan uploaden; afbeeldingen staan in de publieke storage-bucket "announcement-images".',
			'Actief / inactief: zet een bericht op inactief om het te verbergen zonder te verwijderen.',
			'Beheer: Instellingen → Nieuwsberichten.',
		],
	},
	{
		icon: NAV_ICONS.emailTemplates,
		title: NAV_LABELS.emailTemplates,
		description: 'Pas de teksten van automatische e-mails aan zonder code te wijzigen.',
		details: [
			'Beheer: Instellingen → E-mailtemplates (alleen Site Admin mag opslaan).',
			'Templates: o.a. aanmelding bevestigd, proefles ingepland (leerling/docent) en lesovereenkomst aangemaakt.',
			'Variabelen: placeholders zoals {{leerling_naam}} — beschikbare variabelen staan per template vermeld.',
			'Onderwerp & body: pas onderwerp en Markdown-inhoud aan; een voorvertoning toont het resultaat. Testmail versturen vanuit de bewerkingsmodal.',
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
			'Site Admin: volledige toegang inclusief gebruikersbeheer en systeeminstellingen.',
			'Admin: alle beheersfuncties (gebruikers, lessoorten, docenten, leerlingen, overeenkomsten, rapportages).',
			'Staff: leerlingen en docenten beheren, aanmeldingen verwerken, agenda bijhouden en rapportages inzien.',
			'Docent: eigen profiel, beschikbaarheid, leerlingen, agenda en statistieken.',
			'Leerling: eigen profiel, overeenkomsten en (indien van toepassing) ingeplande proefles.',
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
			'BTW-logica: leeftijd wordt berekend op basis van geboortedatum leerling versus lesdatum t.o.v. de leeftijdsgrens — jongeren vrijgesteld, volwassenen belast. Onbekende geboortedatum → categorie "unknown".',
			'Betalingen: Stripe per lesovereenkomst (iDEAL-setup, SubscriptionSchedule, webhooks).',
			'E-mail: alle transactionele mails lopen via de edge function send-template-email (Resend). Templates staan in email_templates en zijn per project aanpasbaar. De helper sendTemplateEmail wordt hergebruikt vanuit meerdere functies (schedule-trial-lesson, submit-signup-request, create-duo-agreements, ...).',
			'Migraties: elke schemawijziging staat als bestand in supabase/migrations/ (logische Nederlandse naam). Na een migratie: database resetten en TypeScript-types regenereren in src/integrations/supabase/types.ts (lokaal of linked).',
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
