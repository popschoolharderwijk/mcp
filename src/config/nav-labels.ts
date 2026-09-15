import type { IconType } from 'react-icons';
import {
	LuBookOpen,
	LuBuilding2,
	LuCalculator,
	LuCalendar,
	LuCalendarOff,
	LuChartBar,
	LuClipboardList,
	LuCreditCard,
	LuFileSpreadsheet,
	LuFileText,
	LuFolderOpen,
	LuGraduationCap,
	LuInbox,
	LuLayoutDashboard,
	LuMail,
	LuMegaphone,
	LuMusic2,
	LuSettings,
	LuShieldAlert,
	LuShieldCheck,
	LuUpload,
	LuUser,
	LuUserCog,
	LuUsers,
	LuWallet,
} from 'react-icons/lu';

/**
 * Single source for nav identity: label + icon per item.
 * Use these everywhere (sidebar, breadcrumbs, page titles, dashboard, command palette)
 * so names cannot drift ("Afspraken" vs "Overeenkomsten", "Lesvakken" vs "Lessoorten").
 */
const NAV_ITEMS = {
	agenda: { label: 'Agenda', icon: LuCalendar },
	dashboard: { label: 'Dashboard', icon: LuLayoutDashboard },
	users: { label: 'Gebruikers', icon: LuUserCog },
	lessonTypes: { label: 'Lessoorten', icon: LuMusic2 },
	projects: { label: 'Projecten', icon: LuFolderOpen },
	settings: { label: 'Instellingen', icon: LuSettings },
	adminSection: { label: 'Beheer', icon: LuShieldCheck },
	teachers: { label: 'Docenten', icon: LuGraduationCap },
	availability: { label: 'Beschikbaarheid', icon: LuCalendar },
	myProfile: { label: 'Mijn profiel', icon: LuUser },
	myAvailability: { label: 'Mijn beschikbaarheid', icon: LuCalendar },
	myStatistics: { label: 'Mijn statistieken', icon: LuChartBar },
	students: { label: 'Leerlingen', icon: LuUsers },
	myStudents: { label: 'Mijn leerlingen', icon: LuUsers },
	agreements: { label: 'Overeenkomsten', icon: LuClipboardList },
	lessonGroups: { label: 'Groepslessen', icon: LuUsers },
	signupRequests: { label: 'Aanmeldingen', icon: LuInbox },
	trialLessons: { label: 'Proeflessen', icon: LuGraduationCap },
	myTrial: { label: 'Mijn proefles', icon: LuGraduationCap },
	reports: { label: 'Rapportage', icon: LuChartBar },
	accounting: { label: 'Boekhouding', icon: LuCalculator },
	accountingSettings: { label: 'Boekhouding-instellingen', icon: LuCalculator },
	dataImport: { label: 'Data-import', icon: LuUpload },
	subscriptions: { label: 'Facturatie', icon: LuCreditCard },
	finance: { label: 'Financiën', icon: LuWallet },
	incasso: { label: 'Incasso', icon: LuFileSpreadsheet },
	mandaten: { label: 'Mandaten', icon: LuBuilding2 },
	invoices: { label: 'Facturen', icon: LuFileText },
	myInvoices: { label: 'Mijn facturen', icon: LuFileText },
	noLessonPeriods: { label: 'Lesvrije periodes', icon: LuCalendarOff },
	emailTemplates: { label: 'E-mailtemplates', icon: LuMail },
	announcements: { label: 'Nieuwsberichten', icon: LuMegaphone },
	manual: { label: 'Handleiding', icon: LuBookOpen },
	accountProfile: { label: 'Profiel', icon: LuUser },
	accountAppearance: { label: 'Weergave', icon: LuSettings },
	accountDanger: { label: 'Account', icon: LuShieldAlert },
} as const satisfies Record<string, { label: string; icon: IconType }>;

export type NavLabelKey = keyof typeof NAV_ITEMS;

type NavLabelMap = { [K in NavLabelKey]: (typeof NAV_ITEMS)[K]['label'] };
type NavIconMap = { [K in NavLabelKey]: (typeof NAV_ITEMS)[K]['icon'] };

const NAV_ITEM_KEYS = Object.keys(NAV_ITEMS) as NavLabelKey[];

/** Convenience map: `NAV_LABELS.students` → `'Leerlingen'`. Derived from `NAV_ITEMS`. */
export const NAV_LABELS = Object.fromEntries(NAV_ITEM_KEYS.map((key) => [key, NAV_ITEMS[key].label])) as NavLabelMap;

/** Convenience map: `NAV_ICONS.students` → icon component. Derived from `NAV_ITEMS`. */
export const NAV_ICONS = Object.fromEntries(NAV_ITEM_KEYS.map((key) => [key, NAV_ITEMS[key].icon])) as NavIconMap;
