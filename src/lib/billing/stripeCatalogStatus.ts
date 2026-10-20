export type StripeCatalogStatusKey = 'in_sync' | 'pending' | 'missing' | 'no_tariff' | 'archived' | 'error';

export interface StripeCatalogRowState {
	stripe_product_id: string | null;
	is_active_in_stripe: boolean;
	sync_status: string;
}

export const STRIPE_CATALOG_STATUS_LABELS: Record<StripeCatalogStatusKey, string> = {
	in_sync: 'In sync',
	pending: 'Wacht op synchronisatie',
	missing: 'Ontbreekt',
	no_tariff: 'Ontbreekt: geen tarief',
	archived: 'Gearchiveerd',
	error: 'Fout',
};

/** Overview status for one lesson form, from its tariffs and catalog row. */
export function resolveStripeCatalogStatus(params: {
	hasTariff: boolean;
	lessonTypeActive: boolean;
	row: StripeCatalogRowState | null;
}): StripeCatalogStatusKey {
	const { hasTariff, lessonTypeActive, row } = params;
	if (row?.sync_status === 'error') return 'error';
	if (row?.sync_status === 'pending') return 'pending';
	if (!hasTariff) return 'no_tariff';
	if (!row?.stripe_product_id) return 'missing';
	if (!lessonTypeActive || !row.is_active_in_stripe) return 'archived';
	return 'in_sync';
}

export interface StripeCatalogSyncResponse {
	configured: boolean;
	message?: string;
	results: Array<{ status: string; error?: string }>;
}

/** Toast text after a sync call. */
export function summarizeStripeCatalogSync(response: StripeCatalogSyncResponse): {
	kind: 'info' | 'success' | 'error';
	message: string;
} {
	if (!response.configured) return { kind: 'info', message: response.message ?? 'Stripe is nog niet ingesteld' };
	const errors = response.results.filter((r) => r.status === 'error').length;
	if (errors > 0) return { kind: 'error', message: `Stripe: ${errors} lesvorm(en) niet gesynchroniseerd` };
	return { kind: 'success', message: 'Stripe-catalogus bijgewerkt' };
}
