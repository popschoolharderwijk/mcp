import { NAV_LABELS } from '@/config/nav-items';

export type AppSettingsTabId =
	| 'school-year'
	| 'no-lesson-periods'
	| 'agenda'
	| 'vat'
	| 'branding'
	| 'trial-lessons'
	| 'agreements'
	| 'tips'
	| 'email-templates';

const APP_SETTINGS_TABS = new Set<AppSettingsTabId>([
	'school-year',
	'no-lesson-periods',
	'agenda',
	'vat',
	'branding',
	'trial-lessons',
	'agreements',
	'tips',
	'email-templates',
]);

const DEFAULT_APP_SETTINGS_TAB: AppSettingsTabId = 'school-year';

export const APP_SETTINGS_TAB_ITEMS: { value: AppSettingsTabId; label: string }[] = [
	{ value: 'school-year', label: 'Schooljaar' },
	{ value: 'no-lesson-periods', label: 'Lesvrije periodes' },
	{ value: 'agenda', label: 'Agenda' },
	{ value: 'vat', label: 'Tarieven' },
	{ value: 'branding', label: 'Huisstijl' },
	{ value: 'trial-lessons', label: 'Proeflessen' },
	{ value: 'agreements', label: 'Overeenkomsten' },
	{ value: 'tips', label: NAV_LABELS.tips },
	{ value: 'email-templates', label: 'E-mailtemplates' },
];

export function isAppSettingsTabId(value: string): value is AppSettingsTabId {
	return APP_SETTINGS_TABS.has(value as AppSettingsTabId);
}

export function parseAppSettingsTab(tab: string | undefined): AppSettingsTabId {
	return tab && isAppSettingsTabId(tab) ? tab : DEFAULT_APP_SETTINGS_TAB;
}

export function resolveAppSettingsTabRoute(tab: AppSettingsTabId): string {
	return `/settings/${tab}`;
}

export function resolveAppSettingsTabRedirect(tabParam: string | undefined): string | null {
	const resolved = parseAppSettingsTab(tabParam);
	if (tabParam === resolved) return null;
	return resolveAppSettingsTabRoute(resolved);
}

export type AppSettingsAccess =
	| { kind: 'auth-loading' }
	| { kind: 'forbidden' }
	| { kind: 'redirect'; to: string }
	| { kind: 'ok' };

export function resolveAppSettingsAccess(
	authLoading: boolean,
	canView: boolean,
	tabRedirect: string | null,
): AppSettingsAccess {
	if (authLoading) return { kind: 'auth-loading' };
	if (!canView) return { kind: 'forbidden' };
	if (tabRedirect) return { kind: 'redirect', to: tabRedirect };
	return { kind: 'ok' };
}
