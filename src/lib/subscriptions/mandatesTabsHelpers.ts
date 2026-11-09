export type MandatesTabId = 'active' | 'inactive' | 'pending' | 'unsent';

const MANDATES_TABS = new Set<MandatesTabId>(['active', 'inactive', 'pending', 'unsent']);

const DEFAULT_MANDATES_TAB: MandatesTabId = 'active';

const MANDATES_TAB_ITEMS: { value: MandatesTabId; label: string }[] = [
	{ value: 'active', label: 'Actief' },
	{ value: 'inactive', label: 'Inactief' },
	{ value: 'pending', label: 'In afwachting' },
	{ value: 'unsent', label: 'Niet verstuurd' },
];

export type MandatesTabCounts = Record<MandatesTabId, number>;

/** Append `(n)` when a count is known; keep the bare label while counts are still loading. */
export function buildMandatesTabItems(counts: MandatesTabCounts | null): { value: MandatesTabId; label: string }[] {
	return MANDATES_TAB_ITEMS.map(({ value, label }) => ({
		value,
		label: counts ? `${label} (${counts[value]})` : label,
	}));
}

export function isMandatesTabId(value: string): value is MandatesTabId {
	return MANDATES_TABS.has(value as MandatesTabId);
}

export function parseMandatesTab(tab: string | undefined): MandatesTabId {
	return tab && isMandatesTabId(tab) ? tab : DEFAULT_MANDATES_TAB;
}

export function resolveMandatesTabRoute(tab: MandatesTabId): string {
	return `/mandates/${tab}`;
}

export function resolveMandatesTabRedirect(tabParam: string | undefined): string | null {
	const resolved = parseMandatesTab(tabParam);
	if (tabParam === resolved) return null;
	return resolveMandatesTabRoute(resolved);
}

export type MandatesAccess =
	| { kind: 'auth-loading' }
	| { kind: 'forbidden' }
	| { kind: 'redirect'; to: string }
	| { kind: 'ok' };

export function resolveMandatesAccess(
	authLoading: boolean,
	canView: boolean,
	tabRedirect: string | null,
): MandatesAccess {
	if (authLoading) return { kind: 'auth-loading' };
	if (!canView) return { kind: 'forbidden' };
	if (tabRedirect) return { kind: 'redirect', to: tabRedirect };
	return { kind: 'ok' };
}
