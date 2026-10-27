/**
 * Pure rules for the Stripe catalog: product names, desired prices per tariff and the diff
 * between the app (source of truth) and what exists in Stripe. No Stripe or DB access here.
 */

export type AgeCategory = 'under_21' | 'adult';
export type TaxRateKey = 'nl_21_incl' | 'exempt';
export type BillingKind = 'monthly' | 'one_off';

export interface TariffInput {
	id: string;
	effective_from: string; // YYYY-MM-DD
	amount_under_21_cents: number | null;
	amount_adult_cents: number | null;
}

export interface OptionInput {
	id: string;
	lesson_type_name: string;
	lesson_type_active: boolean;
	duration_minutes: number;
	frequency: string;
	label: string | null;
	billing_kind: BillingKind;
	has_adult_tariff: boolean;
	tariffs: TariffInput[];
}

export interface DesiredPrice {
	tariff_id: string;
	effective_from: string;
	age_category: AgeCategory;
	amount_cents: number;
	recurring: boolean;
	lookup_key: string;
	tax_rate_key: TaxRateKey;
}

export interface ExistingPrice {
	stripe_price_id: string;
	lookup_key: string | null;
	active: boolean;
}

export interface ExistingProduct {
	stripe_product_id: string;
	name: string;
	active: boolean;
}

export interface CatalogPlan {
	createProduct: boolean;
	productUpdate: { name?: string; active?: boolean } | null;
	createPrices: DesiredPrice[];
	reactivatePriceIds: string[];
	archivePriceIds: string[];
}

const FREQUENCY_LABELS: Record<string, string> = {
	daily: 'dagelijks',
	weekly: 'wekelijks',
	biweekly: 'tweewekelijks',
	monthly: 'maandelijks',
};

export function buildProductName(option: OptionInput): string {
	const parts = [option.lesson_type_name.trim()];
	if (option.billing_kind === 'one_off') {
		parts.push('eenmalig');
	} else {
		parts.push(`${option.duration_minutes} min`, FREQUENCY_LABELS[option.frequency] ?? option.frequency);
	}
	const label = option.label?.trim();
	if (label) parts.push(label);
	return parts.join(' · ');
}

export function buildLookupKey(optionId: string, effectiveFrom: string, category: AgeCategory, amountCents: number) {
	return `mcp_opt_${optionId}_${effectiveFrom}_${category === 'adult' ? 'adult' : 'u21'}_${amountCents}`;
}

/** Tariff in force today plus all future tariffs; older tariffs are expired. */
export function selectActiveTariffs(tariffs: TariffInput[], today: string): TariffInput[] {
	const sorted = [...tariffs].sort((a, b) => a.effective_from.localeCompare(b.effective_from));
	const past = sorted.filter((t) => t.effective_from <= today);
	const current = past.at(-1);
	const future = sorted.filter((t) => t.effective_from > today);
	return current ? [current, ...future] : future;
}

export function buildDesiredPrices(option: OptionInput, today: string): DesiredPrice[] {
	const recurring = option.billing_kind === 'monthly';
	const prices: DesiredPrice[] = [];
	for (const tariff of selectActiveTariffs(option.tariffs, today)) {
		const under = tariff.amount_under_21_cents;
		if (under != null && under > 0) {
			prices.push({
				tariff_id: tariff.id,
				effective_from: tariff.effective_from,
				age_category: 'under_21',
				amount_cents: under,
				recurring,
				lookup_key: buildLookupKey(option.id, tariff.effective_from, 'under_21', under),
				tax_rate_key: 'exempt',
			});
		}
		const adult = tariff.amount_adult_cents;
		if (option.has_adult_tariff && adult != null && adult > 0) {
			prices.push({
				tariff_id: tariff.id,
				effective_from: tariff.effective_from,
				age_category: 'adult',
				amount_cents: adult,
				recurring,
				lookup_key: buildLookupKey(option.id, tariff.effective_from, 'adult', adult),
				tax_rate_key: 'nl_21_incl',
			});
		}
	}
	return prices;
}

export function buildPriceNickname(price: DesiredPrice): string {
	const who = price.age_category === 'adult' ? '21+ (incl. 21% btw)' : 'Jonger dan 21 (btw-vrijgesteld)';
	return `${who} · vanaf ${price.effective_from}`;
}

export function buildPriceCreateParams(productId: string, optionId: string, price: DesiredPrice) {
	return {
		product: productId,
		currency: 'eur',
		unit_amount: price.amount_cents,
		tax_behavior: 'inclusive' as const,
		lookup_key: price.lookup_key,
		nickname: buildPriceNickname(price),
		...(price.recurring ? { recurring: { interval: 'month' as const } } : {}),
		metadata: {
			lesson_type_option_id: optionId,
			tariff_id: price.tariff_id,
			effective_from: price.effective_from,
			age_category: price.age_category,
			tax_rate_key: price.tax_rate_key,
		},
	};
}

export const TAX_RATE_PARAMS: Record<TaxRateKey, Record<string, unknown>> = {
	nl_21_incl: {
		display_name: 'Btw',
		description: 'Btw 21%',
		percentage: 21,
		inclusive: true,
		country: 'NL',
		jurisdiction: 'NL',
		metadata: { mcp_key: 'nl_21_incl' },
	},
	exempt: {
		display_name: 'Btw vrijgesteld',
		description: 'Btw-vrijgesteld (jonger dan 21)',
		percentage: 0,
		inclusive: true,
		country: 'NL',
		jurisdiction: 'NL',
		metadata: { mcp_key: 'exempt' },
	},
};

/**
 * Diff app ↔ Stripe for one lesson form. `option` null = orphan (form deleted).
 * A form without any active tariff gets no product (existing one is archived).
 */
export function planCatalogSync(
	option: OptionInput | null,
	product: ExistingProduct | null,
	prices: ExistingPrice[],
	today: string,
): CatalogPlan {
	const desired = option ? buildDesiredPrices(option, today) : [];
	const wantProduct = option !== null && desired.length > 0;
	const wantActive = wantProduct && option.lesson_type_active;

	const plan: CatalogPlan = {
		createProduct: false,
		productUpdate: null,
		createPrices: [],
		reactivatePriceIds: [],
		archivePriceIds: [],
	};

	if (!product) {
		if (!wantProduct) return plan;
		plan.createProduct = true;
		plan.createPrices = wantActive ? desired : [];
		return plan;
	}

	const update: { name?: string; active?: boolean } = {};
	if (option && wantProduct) {
		const name = buildProductName(option);
		if (product.name !== name) update.name = name;
	}
	if (product.active !== wantActive) update.active = wantActive;
	plan.productUpdate = Object.keys(update).length > 0 ? update : null;

	const desiredKeys = new Set(wantActive ? desired.map((d) => d.lookup_key) : []);
	const byKey = new Map(prices.filter((p) => p.lookup_key).map((p) => [p.lookup_key as string, p]));

	for (const d of wantActive ? desired : []) {
		const existing = byKey.get(d.lookup_key);
		if (!existing) plan.createPrices.push(d);
		else if (!existing.active) plan.reactivatePriceIds.push(existing.stripe_price_id);
	}
	for (const p of prices) {
		if (p.active && !(p.lookup_key && desiredKeys.has(p.lookup_key))) plan.archivePriceIds.push(p.stripe_price_id);
	}
	return plan;
}

export function isPlanEmpty(plan: CatalogPlan): boolean {
	return (
		!plan.createProduct &&
		plan.productUpdate === null &&
		plan.createPrices.length === 0 &&
		plan.reactivatePriceIds.length === 0 &&
		plan.archivePriceIds.length === 0
	);
}

export type CatalogStatus = 'in_sync' | 'no_tariff' | 'archived';

/** Outcome status after a successful sync of one lesson form. */
export function resolveCatalogStatus(option: OptionInput | null, today: string): CatalogStatus {
	if (!option) return 'archived';
	if (buildDesiredPrices(option, today).length === 0) return 'no_tariff';
	return option.lesson_type_active ? 'in_sync' : 'archived';
}

/** Stripe price as seen globally by lookup key (may live on another product). */
export interface LookupPrice {
	stripe_price_id: string;
	lookup_key: string;
	product_id: string;
	active: boolean;
	unit_amount: number | null;
	recurring: boolean;
}

export interface PriceAdoptionPlan {
	/** Desired prices already present in Stripe on this product with the same amount: only persist. */
	adopt: Array<{ price: DesiredPrice; stripe_price_id: string; active: boolean }>;
	/** Desired prices to create; `transfer` moves the lookup key from an existing, different price. */
	create: Array<{ price: DesiredPrice; transfer: boolean }>;
}

/**
 * Decide per desired price whether Stripe already has it (adopt) or a new price is needed.
 * A lookup key held by a price on another product or with a different amount/interval is
 * transferred to a fresh price, so the deterministic key always points at the right amount.
 */
export function planPriceAdoption(
	desired: DesiredPrice[],
	lookupPrices: LookupPrice[],
	productId: string,
): PriceAdoptionPlan {
	const byKey = new Map(lookupPrices.map((p) => [p.lookup_key, p]));
	const plan: PriceAdoptionPlan = { adopt: [], create: [] };
	for (const d of desired) {
		const found = byKey.get(d.lookup_key);
		if (!found) {
			plan.create.push({ price: d, transfer: false });
			continue;
		}
		const same =
			found.product_id === productId && found.unit_amount === d.amount_cents && found.recurring === d.recurring;
		if (same) plan.adopt.push({ price: d, stripe_price_id: found.stripe_price_id, active: found.active });
		else plan.create.push({ price: d, transfer: true });
	}
	return plan;
}

/** Idempotency key for a price create; includes the product so a re-created product never collides. */
export function priceIdempotencyKey(lookupKey: string, productId: string, transfer: boolean): string {
	return `${lookupKey}:${productId}${transfer ? ':t' : ''}`;
}

/** Existing Stripe tax rate usable for our key: tagged by us, or same percentage + inclusive. */
export function matchTaxRateKey(rate: {
	active: boolean;
	percentage: number;
	inclusive: boolean;
	metadata?: Record<string, string> | null;
}): TaxRateKey | null {
	if (!rate.active) return null;
	const tagged = rate.metadata?.mcp_key;
	if (tagged === 'nl_21_incl' || tagged === 'exempt') return tagged;
	if (!rate.inclusive) return null;
	if (rate.percentage === 21) return 'nl_21_incl';
	if (rate.percentage === 0) return 'exempt';
	return null;
}
