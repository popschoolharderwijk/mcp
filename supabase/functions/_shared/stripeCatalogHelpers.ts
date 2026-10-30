/**
 * Pure rules for syncing lesson_type_options → Stripe Products/Prices.
 * Amounts are the youth/adult per-lesson cents from the option row.
 */

export type CatalogAgeBand = 'youth' | 'adult';

export interface CatalogOptionInput {
	id: string;
	lesson_type_name: string;
	lesson_type_active: boolean;
	duration_minutes: number;
	frequency: string;
	price_per_lesson_youth_cents: number | null;
	price_per_lesson_adult_cents: number | null;
}

export interface CatalogDesiredPrice {
	age_band: CatalogAgeBand;
	amount_cents: number;
	lookup_key: string;
	nickname: string;
}

export interface CatalogExistingPrice {
	stripe_price_id: string;
	lookup_key: string | null;
	active: boolean;
	unit_amount: number | null;
	age_band: string | null;
}

export interface CatalogExistingProduct {
	stripe_product_id: string;
	name: string;
	active: boolean;
}

export interface CatalogSyncPlan {
	createProduct: boolean;
	productUpdate: { name?: string; active?: boolean } | null;
	createPrices: CatalogDesiredPrice[];
	archivePriceIds: string[];
}

const FREQUENCY_LABELS: Record<string, string> = {
	daily: 'dagelijks',
	weekly: 'wekelijks',
	biweekly: 'tweewekelijks',
	monthly: 'maandelijks',
};

function unwrapJoinedRecord<T>(value: T | T[] | null | undefined): T | null {
	if (!value) return null;
	return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function mapCatalogOptionRow(row: {
	id: string;
	duration_minutes: number;
	frequency: string;
	price_per_lesson_youth_cents: number | null;
	price_per_lesson_adult_cents: number | null;
	lesson_types: { name: string; is_active: boolean } | { name: string; is_active: boolean }[] | null;
}): CatalogOptionInput {
	const lessonType = unwrapJoinedRecord(row.lesson_types);
	return {
		id: row.id,
		lesson_type_name: lessonType?.name ?? 'Lessoort',
		lesson_type_active: lessonType?.is_active ?? false,
		duration_minutes: row.duration_minutes,
		frequency: row.frequency,
		price_per_lesson_youth_cents: row.price_per_lesson_youth_cents,
		price_per_lesson_adult_cents: row.price_per_lesson_adult_cents,
	};
}

export function buildCatalogProductName(option: CatalogOptionInput): string {
	const freq = FREQUENCY_LABELS[option.frequency] ?? option.frequency;
	return `${option.lesson_type_name.trim()} · ${option.duration_minutes} min · ${freq}`;
}

export function buildCatalogLookupKey(optionId: string, ageBand: CatalogAgeBand, amountCents: number): string {
	return `mcp_lto_${optionId}_${ageBand}_${amountCents}`;
}

export function buildCatalogDesiredPrices(option: CatalogOptionInput): CatalogDesiredPrice[] {
	const prices: CatalogDesiredPrice[] = [];
	const youth = option.price_per_lesson_youth_cents;
	if (youth != null && youth > 0) {
		prices.push({
			age_band: 'youth',
			amount_cents: youth,
			lookup_key: buildCatalogLookupKey(option.id, 'youth', youth),
			nickname: `Jonger dan 21 · ${youth} ct`,
		});
	}
	const adult = option.price_per_lesson_adult_cents;
	if (adult != null && adult > 0) {
		prices.push({
			age_band: 'adult',
			amount_cents: adult,
			lookup_key: buildCatalogLookupKey(option.id, 'adult', adult),
			nickname: `21+ · ${adult} ct`,
		});
	}
	return prices;
}

export function planCatalogProductUpdate(
	wantProduct: boolean,
	desiredName: string | null,
	product: CatalogExistingProduct | null,
	option: CatalogOptionInput | null,
): CatalogSyncPlan['productUpdate'] {
	if (!product) return null;
	if (!option) return wantProduct || !product.active ? null : { active: false };
	const update: { name?: string; active?: boolean } = {};
	if (desiredName != null && product.name !== desiredName) update.name = desiredName;
	if (product.active !== wantProduct) update.active = wantProduct;
	return update.name === undefined && update.active === undefined ? null : update;
}

function planCatalogPriceChanges(
	desired: CatalogDesiredPrice[],
	prices: CatalogExistingPrice[],
): Pick<CatalogSyncPlan, 'createPrices' | 'archivePriceIds'> {
	const desiredKeys = new Set(desired.map((p) => p.lookup_key));
	return {
		createPrices: desired.filter((d) => !prices.some((p) => p.lookup_key === d.lookup_key && p.active)),
		archivePriceIds: prices
			.filter((p) => p.active && (!p.lookup_key || !desiredKeys.has(p.lookup_key)))
			.map((p) => p.stripe_price_id),
	};
}

/** Diff app option ↔ Stripe product/prices for one lesson type option. */
export function planCatalogOptionSync(
	option: CatalogOptionInput | null,
	product: CatalogExistingProduct | null,
	prices: CatalogExistingPrice[],
): CatalogSyncPlan {
	const desired = option ? buildCatalogDesiredPrices(option) : [];
	const wantProduct = option !== null && desired.length > 0 && option.lesson_type_active;
	const desiredName = option ? buildCatalogProductName(option) : null;
	const priceChanges = planCatalogPriceChanges(desired, prices);
	return {
		createProduct: wantProduct && !product,
		productUpdate: planCatalogProductUpdate(wantProduct, desiredName, product, option),
		createPrices: priceChanges.createPrices,
		archivePriceIds: priceChanges.archivePriceIds,
	};
}

export interface CatalogSyncResultRow {
	lesson_type_option_id: string;
	name: string;
	status: 'synced' | 'skipped' | 'error';
	changed: boolean;
	error?: string;
}

export function resolveSyncedCatalogRow(
	optionId: string,
	name: string,
	productId: string | null,
	changed: boolean,
	hadActivePrice: boolean,
): CatalogSyncResultRow {
	if (!hadActivePrice && !productId && !changed) {
		return { lesson_type_option_id: optionId, name, status: 'skipped', changed: false };
	}
	return { lesson_type_option_id: optionId, name, status: 'synced', changed };
}

export function summarizeCatalogSyncResults(results: CatalogSyncResultRow[]): {
	synced: number;
	skipped: number;
	errors: number;
	changed: number;
} {
	return {
		synced: results.filter((r) => r.status === 'synced').length,
		skipped: results.filter((r) => r.status === 'skipped').length,
		errors: results.filter((r) => r.status === 'error').length,
		changed: results.filter((r) => r.changed).length,
	};
}
