import type { IconType } from 'react-icons';
import {
	LuBookOpen,
	LuCalendar,
	LuCalendarOff,
	LuChartBar,
	LuClipboardList,
	LuFolderOpen,
	LuGraduationCap,
	LuInbox,
	LuLayoutDashboard,
	LuLightbulb,
	LuMail,
	LuMegaphone,
	LuMusic2,
	LuSettings,
	LuShieldAlert,
	LuShieldCheck,
	LuUser,
	LuUserCog,
	LuUsers,
} from 'react-icons/lu';

/**
 * Single source for nav identity: label + icon + optional page description per item.
 * Use these everywhere (sidebar, breadcrumbs, page titles, PageShell descriptions,
 * dashboard, command palette) so names and blurbs cannot drift.
 */
const NAV_ITEMS = {
	agenda: { label: 'Agenda', icon: LuCalendar },
	dashboard: { label: 'Dashboard', icon: LuLayoutDashboard, description: 'Je lessen' },
	users: {
		label: 'Gebruikers',
		icon: LuUserCog,
		description: 'Beheer alle gebruikers en hun rollen',
	},
	lessonTypes: {
		label: 'Lessoorten',
		icon: LuMusic2,
		description: 'Beheer alle lessoorten en hun configuratie',
	},
	projects: { label: 'Projecten', icon: LuFolderOpen, description: 'Beheer alle projecten' },
	settings: {
		label: 'Instellingen',
		icon: LuSettings,
		description: 'Schooljaar, lesvrije periodes, agenda, tarieven, e-mailtemplates en overige siteconfiguratie',
	},
	adminSection: { label: 'Beheer', icon: LuShieldCheck },
	teachers: {
		label: 'Docenten',
		icon: LuGraduationCap,
		description: 'Beheer alle docenten en hun profielgegevens',
	},
	availability: {
		label: 'Beschikbaarheid',
		icon: LuCalendar,
		description: 'Bekijk de beschikbaarheid van alle docenten',
	},
	myProfile: {
		label: 'Mijn profiel',
		icon: LuUser,
		description: 'Bekijk je profielgegevens en lesovereenkomsten',
	},
	myAvailability: {
		label: 'Mijn beschikbaarheid',
		icon: LuCalendar,
		description: 'Beheer je beschikbare dagen en tijden voor het plannen van lessen',
	},
	myStatistics: {
		label: 'Mijn statistieken',
		icon: LuChartBar,
		description: 'Overzicht van je lesactiviteiten',
	},
	students: {
		label: 'Leerlingen',
		icon: LuUsers,
		description: 'Beheer alle leerlingen en hun gegevens',
	},
	myStudents: {
		label: 'Mijn leerlingen',
		icon: LuUsers,
		description:
			'Overzicht van alle leerlingen met lesovereenkomsten bij jou. Klik op een leerling om de leshistorie te bekijken.',
	},
	agreements: {
		label: 'Overeenkomsten',
		icon: LuClipboardList,
		description: 'Beheer lesovereenkomsten tussen leerlingen en docenten',
	},
	lessonGroups: {
		label: 'Groepslessen',
		icon: LuUsers,
		description: 'Beheer lesgroepen en hun deelnemers',
	},
	signupRequests: {
		label: 'Aanmeldingen',
		icon: LuInbox,
		description: 'Beheer openstaande en afgehandelde aanmeldingen',
	},
	trialLessons: {
		label: 'Proeflessen',
		icon: LuGraduationCap,
		description: 'Overzicht van ingeplande proeflessen',
	},
	myTrial: {
		label: 'Mijn proefles',
		icon: LuGraduationCap,
		description: 'Bekijk je proefles en geef aan of je verder wilt',
	},
	reports: {
		label: 'Rapportage',
		icon: LuChartBar,
		description: 'Urenrapportage per docent, lessoort en leeftijdscategorie',
	},
	noLessonPeriods: { label: 'Lesvrije periodes', icon: LuCalendarOff },
	emailTemplates: { label: 'E-mailtemplates', icon: LuMail },
	announcements: {
		label: 'Nieuwsberichten',
		icon: LuMegaphone,
		description: 'Plaats berichten die getoond worden op het dashboard van docenten en/of leerlingen',
	},
	manual: { label: 'Handleiding', icon: LuBookOpen },
	tips: { label: 'Tips', icon: LuLightbulb },
	accountProfile: { label: 'Profiel', icon: LuUser },
	accountAppearance: { label: 'Weergave', icon: LuSettings },
	accountDanger: { label: 'Account', icon: LuShieldAlert },
} as const satisfies Record<string, { label: string; icon: IconType; description?: string }>;

export type NavLabelKey = keyof typeof NAV_ITEMS;

type NavLabelMap = { [K in NavLabelKey]: (typeof NAV_ITEMS)[K]['label'] };
type NavIconMap = { [K in NavLabelKey]: (typeof NAV_ITEMS)[K]['icon'] };
/** NAV_ITEMS keys that define a page description. */
export type NavDescriptionKey = {
	[K in NavLabelKey]: (typeof NAV_ITEMS)[K] extends { description: string } ? K : never;
}[NavLabelKey];
type NavDescriptionMap = { [K in NavDescriptionKey]: string };

const NAV_ITEM_KEYS = Object.keys(NAV_ITEMS) as NavLabelKey[];

/** Convenience map: `NAV_LABELS.students` → `'Leerlingen'`. Derived from `NAV_ITEMS`. */
export const NAV_LABELS = Object.fromEntries(NAV_ITEM_KEYS.map((key) => [key, NAV_ITEMS[key].label])) as NavLabelMap;

/** Convenience map: `NAV_ICONS.students` → icon component. Derived from `NAV_ITEMS`. */
export const NAV_ICONS = Object.fromEntries(NAV_ITEM_KEYS.map((key) => [key, NAV_ITEMS[key].icon])) as NavIconMap;

/** Convenience map: `NAV_DESCRIPTIONS.settings` → page blurb. Only keys that define a description. */
export const NAV_DESCRIPTIONS = Object.fromEntries(
	NAV_ITEM_KEYS.filter((key) => 'description' in NAV_ITEMS[key]).map((key) => [
		key,
		(NAV_ITEMS[key] as { description: string }).description,
	]),
) as NavDescriptionMap;
