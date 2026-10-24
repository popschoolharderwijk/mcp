export type PersonDetailTabId = 'profile' | 'address' | 'agenda';

const PERSON_DETAIL_TABS = new Set<PersonDetailTabId>(['profile', 'address', 'agenda']);

const DEFAULT_PERSON_DETAIL_TAB: PersonDetailTabId = 'profile';

export function isPersonDetailTabId(value: string): value is PersonDetailTabId {
	return PERSON_DETAIL_TABS.has(value as PersonDetailTabId);
}

export function parsePersonDetailTab(tab: string | undefined): PersonDetailTabId {
	return tab && isPersonDetailTabId(tab) ? tab : DEFAULT_PERSON_DETAIL_TAB;
}

export function resolvePersonDetailTabRoute(basePath: string, tab: PersonDetailTabId): string {
	return `${basePath}/${tab}`;
}

/** When the URL tab is missing or invalid, return the canonical path to redirect to. */
export function resolvePersonDetailTabRedirect(basePath: string, tabParam: string | undefined): string | null {
	const resolved = parsePersonDetailTab(tabParam);
	if (tabParam === resolved) return null;
	return resolvePersonDetailTabRoute(basePath, resolved);
}

export function buildPersonDetailPath(basePath: string, tab: PersonDetailTabId = DEFAULT_PERSON_DETAIL_TAB): string {
	return resolvePersonDetailTabRoute(basePath, tab);
}

export const PERSON_DETAIL_TAB_ITEMS = [
	{ value: 'profile' as const, label: 'Profiel' },
	{ value: 'address' as const, label: 'Adres' },
	{ value: 'agenda' as const, label: 'Agenda' },
];
