export type MandatesTabId = 'active' | 'canceled' | 'pending' | 'unsent';

const MANDATES_TABS = new Set<MandatesTabId>(['active', 'canceled', 'pending', 'unsent']);

const DEFAULT_MANDATES_TAB: MandatesTabId = 'active';

const MANDATES_TAB_ITEMS: { value: MandatesTabId; label: string }[] = [
	{ value: 'active', label: 'Actief' },
	{ value: 'canceled', label: 'Geannuleerd' },
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

export type MandatesReconcileSummary = {
	configured?: boolean;
	checked: number;
	synced: number;
	canceled: number;
	skipped: number;
	failed: number;
	error?: string;
};

export function parseMandatesReconcileSummary(data: unknown): MandatesReconcileSummary | null {
	if (!data || typeof data !== 'object') return null;
	const row = data as Record<string, unknown>;
	if (typeof row.error === 'string') {
		return {
			checked: 0,
			synced: 0,
			canceled: 0,
			skipped: 0,
			failed: 0,
			error: row.error,
		};
	}
	if (
		typeof row.checked !== 'number' ||
		typeof row.synced !== 'number' ||
		typeof row.canceled !== 'number' ||
		typeof row.skipped !== 'number' ||
		typeof row.failed !== 'number'
	) {
		return null;
	}
	return {
		configured: typeof row.configured === 'boolean' ? row.configured : undefined,
		checked: row.checked,
		synced: row.synced,
		canceled: row.canceled,
		skipped: row.skipped,
		failed: row.failed,
	};
}

/** Dutch toast copy for a successful Mandates reconcile run. */
export function formatMandatesReconcileToast(summary: MandatesReconcileSummary): string {
	if (summary.configured === false) return 'Stripe is niet geconfigureerd.';
	if (summary.checked === 0) return 'Geen machtigingen om te synchroniseren.';
	const parts = [`${summary.checked} gecontroleerd`, `${summary.synced} bijgewerkt`];
	if (summary.canceled > 0) parts.push(`${summary.canceled} geannuleerd`);
	if (summary.skipped > 0) parts.push(`${summary.skipped} overgeslagen`);
	if (summary.failed > 0) parts.push(`${summary.failed} mislukt`);
	return parts.join(', ');
}

/** Soft poll while Machtigingen is open so webhook-driven Stripe cancels show up without leaving the page. */
export const MANDATES_VISIBLE_POLL_MS = 15_000;

/** Dashboard notice link: prefer pending when any invite was sent; otherwise unsent. */
export function resolveAwaitingMandatesNoticeTab(
	counts: Pick<MandatesTabCounts, 'pending' | 'unsent'>,
): 'pending' | 'unsent' {
	if (counts.unsent > 0 && counts.pending === 0) return 'unsent';
	return 'pending';
}

export function countAwaitingMandatesFromTabs(counts: Pick<MandatesTabCounts, 'pending' | 'unsent'>): number {
	return counts.pending + counts.unsent;
}

/** Keep the previous reference when serialized content is unchanged (avoids needless re-renders). */
export function keepIfUnchanged<T>(previous: T, next: T): T {
	return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
}

export function sameMandatesTabCounts(a: MandatesTabCounts | null, b: MandatesTabCounts | null): boolean {
	return keepIfUnchanged(a, b) === a;
}

export function mandateOverviewLoadErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Kon het overzicht niet laden';
}

export async function fetchMandateRowsKeepingUnchanged<T>(
	fetchRows: () => Promise<T[]>,
	setRows: (update: T[] | ((previous: T[]) => T[])) => void,
): Promise<{ ok: true } | { ok: false; error: unknown }> {
	try {
		const next = await fetchRows();
		setRows((previous) => keepIfUnchanged(previous, next));
		return { ok: true };
	} catch (error) {
		return { ok: false, error };
	}
}
