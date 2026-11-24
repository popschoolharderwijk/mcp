export type PersonDetailTabId = 'profile' | 'address' | 'agreements' | 'availability' | 'agenda';

const PERSON_DETAIL_TABS = new Set<PersonDetailTabId>(['profile', 'address', 'agreements', 'availability', 'agenda']);

const DEFAULT_PERSON_DETAIL_TAB: PersonDetailTabId = 'profile';

/** Own-profile base path; default tab uses this path with no extra segment. */
export const OWN_PROFILE_BASE_PATH = '/profile';

export function isOwnProfileBasePath(basePath: string): boolean {
	return basePath === OWN_PROFILE_BASE_PATH;
}

export function isPersonDetailTabId(value: string): value is PersonDetailTabId {
	return PERSON_DETAIL_TABS.has(value as PersonDetailTabId);
}

export function parsePersonDetailTab(
	tab: string | undefined,
	options?: { includeAgenda?: boolean },
): PersonDetailTabId {
	const includeAgenda = options?.includeAgenda ?? true;
	if (!tab || !isPersonDetailTabId(tab)) return DEFAULT_PERSON_DETAIL_TAB;
	if (!includeAgenda && tab === 'agenda') return DEFAULT_PERSON_DETAIL_TAB;
	return tab;
}

export function resolvePersonDetailTabRoute(basePath: string, tab: PersonDetailTabId): string {
	if (isOwnProfileBasePath(basePath) && tab === DEFAULT_PERSON_DETAIL_TAB) {
		return OWN_PROFILE_BASE_PATH;
	}
	return `${basePath}/${tab}`;
}

/** When the URL tab is missing or invalid, return the canonical path to redirect to. */
export function resolvePersonDetailTabRedirect(
	basePath: string,
	tabParam: string | undefined,
	options?: { includeAgenda?: boolean },
): string | null {
	const resolved = parsePersonDetailTab(tabParam, options);
	const canonical = resolvePersonDetailTabRoute(basePath, resolved);
	const current = tabParam === undefined ? basePath : `${basePath}/${tabParam}`;
	if (current === canonical) return null;
	return canonical;
}

export function buildPersonDetailPath(basePath: string, tab: PersonDetailTabId = DEFAULT_PERSON_DETAIL_TAB): string {
	return resolvePersonDetailTabRoute(basePath, tab);
}

export function buildPersonDetailTabItems(options?: { includeAgenda?: boolean }) {
	const includeAgenda = options?.includeAgenda ?? true;
	const items: { value: PersonDetailTabId; label: string }[] = [
		{ value: 'profile', label: 'Profiel' },
		{ value: 'address', label: 'Adres' },
	];
	if (includeAgenda) {
		items.push({ value: 'agenda', label: 'Agenda' });
	}
	return items;
}

export function buildAgreementsTabLabel(agreementsCount: number): string {
	return `Lesovereenkomsten (${agreementsCount})`;
}

function buildAvailabilityTabLabel(availabilityCount: number): string {
	return `Beschikbaarheid (${availabilityCount})`;
}

export function buildTeacherDetailTabItems(
	agreementsCount: number,
	availabilityCount: number,
	options?: { includeAgenda?: boolean },
) {
	const includeAgenda = options?.includeAgenda ?? true;
	const items: { value: PersonDetailTabId; label: string }[] = [
		{ value: 'profile', label: 'Profiel' },
		{ value: 'address', label: 'Adres' },
		{ value: 'agreements', label: buildAgreementsTabLabel(agreementsCount) },
		{ value: 'availability', label: buildAvailabilityTabLabel(availabilityCount) },
	];
	if (includeAgenda) {
		items.push({ value: 'agenda', label: 'Agenda' });
	}
	return items;
}
