// Stripe Product/Price sync for lesson_type_options (IO). Pure planning lives in stripeCatalogHelpers.ts.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type Stripe from 'npm:stripe@17.5.0';
import { getSafeErrorMessage } from './errors.ts';
import {
	buildCatalogProductName,
	type CatalogExistingPrice,
	type CatalogExistingProduct,
	type CatalogOptionInput,
	type CatalogSyncResultRow,
	mapCatalogOptionRow,
	planCatalogOptionSync,
	resolveSyncedCatalogRow,
} from './stripeCatalogHelpers.ts';

type OptionDbRow = {
	id: string;
	lesson_type_id: string;
	duration_minutes: number;
	frequency: string;
	price_per_lesson_youth_cents: number | null;
	price_per_lesson_adult_cents: number | null;
	lesson_types: { name: string; is_active: boolean } | { name: string; is_active: boolean }[] | null;
};

async function findStripeProduct(stripe: Stripe, optionId: string): Promise<Stripe.Product | null> {
	const found = await stripe.products.search({
		query: `metadata['lesson_type_option_id']:'${optionId}'`,
		limit: 1,
	});
	return found.data[0] ?? null;
}

async function listStripePrices(stripe: Stripe, productId: string): Promise<CatalogExistingPrice[]> {
	const prices: CatalogExistingPrice[] = [];
	for await (const p of stripe.prices.list({ product: productId, limit: 100 })) {
		prices.push({
			stripe_price_id: p.id,
			lookup_key: p.lookup_key,
			active: p.active,
			unit_amount: p.unit_amount,
			age_band: p.metadata?.age_band ?? null,
		});
	}
	return prices;
}

async function applyCatalogProductPlan(
	stripe: Stripe,
	option: CatalogOptionInput,
	name: string,
	plan: ReturnType<typeof planCatalogOptionSync>,
	productId: string | null,
): Promise<{ productId: string | null; changed: boolean }> {
	const nextId = productId;
	let changed = false;
	if (plan.createProduct) {
		const created = await stripe.products.create(
			{ name, metadata: { lesson_type_option_id: option.id } },
			{ idempotencyKey: `mcp_product_${option.id}` },
		);
		return { productId: created.id, changed: true };
	}
	if (nextId && plan.productUpdate) {
		await stripe.products.update(nextId, plan.productUpdate);
		changed = true;
	}
	return { productId: nextId, changed };
}

async function applyCatalogPricePlan(
	stripe: Stripe,
	option: CatalogOptionInput,
	productId: string,
	plan: ReturnType<typeof planCatalogOptionSync>,
): Promise<boolean> {
	let changed = false;
	for (const price of plan.createPrices) {
		await stripe.prices.create(
			{
				currency: 'eur',
				product: productId,
				unit_amount: price.amount_cents,
				recurring: { interval: 'month', interval_count: 1 },
				nickname: price.nickname,
				lookup_key: price.lookup_key,
				transfer_lookup_key: true,
				metadata: { lesson_type_option_id: option.id, age_band: price.age_band },
			},
			{ idempotencyKey: price.lookup_key },
		);
		changed = true;
	}
	for (const id of plan.archivePriceIds) {
		await stripe.prices.update(id, { active: false });
		changed = true;
	}
	return changed;
}

function toExistingProduct(stripeProduct: Stripe.Product | null): CatalogExistingProduct | null {
	if (!stripeProduct) return null;
	return { stripe_product_id: stripeProduct.id, name: stripeProduct.name, active: stripeProduct.active };
}

async function loadExistingPrices(stripe: Stripe, stripeProduct: Stripe.Product | null) {
	if (!stripeProduct) return [] as CatalogExistingPrice[];
	return listStripePrices(stripe, stripeProduct.id);
}

async function applyPricesIfProduct(
	stripe: Stripe,
	option: CatalogOptionInput,
	productId: string | null,
	plan: ReturnType<typeof planCatalogOptionSync>,
): Promise<boolean> {
	if (!productId) return false;
	return applyCatalogPricePlan(stripe, option, productId, plan);
}

function catalogHadActivePrice(createCount: number, existingPrices: CatalogExistingPrice[]): boolean {
	if (createCount > 0) return true;
	return existingPrices.some((p) => p.active);
}

async function syncOneOptionBody(
	stripe: Stripe,
	option: CatalogOptionInput,
	name: string,
): Promise<CatalogSyncResultRow> {
	const stripeProduct = await findStripeProduct(stripe, option.id);
	const existingProduct = toExistingProduct(stripeProduct);
	const existingPrices = await loadExistingPrices(stripe, stripeProduct);
	const plan = planCatalogOptionSync(option, existingProduct, existingPrices);
	const productIdHint = stripeProduct ? stripeProduct.id : null;
	const productStep = await applyCatalogProductPlan(stripe, option, name, plan, productIdHint);
	const priceChanged = await applyPricesIfProduct(stripe, option, productStep.productId, plan);
	const changed = productStep.changed ? true : priceChanged;
	return resolveSyncedCatalogRow(
		option.id,
		name,
		productStep.productId,
		changed,
		catalogHadActivePrice(plan.createPrices.length, existingPrices),
	);
}

async function syncOneOption(stripe: Stripe, option: CatalogOptionInput): Promise<CatalogSyncResultRow> {
	const name = buildCatalogProductName(option);
	try {
		return await syncOneOptionBody(stripe, option, name);
	} catch (err) {
		console.error('sync-stripe-catalog item error', option.id, err);
		return {
			lesson_type_option_id: option.id,
			name,
			status: 'error',
			changed: false,
			error: getSafeErrorMessage(err, 'Catalogussync mislukt'),
		};
	}
}

function applyCatalogOptionFilters(
	query: { eq: (col: string, val: string) => typeof query },
	filters: { lesson_type_id?: string; lesson_type_option_id?: string },
) {
	let next = query;
	if (filters.lesson_type_option_id) next = next.eq('id', filters.lesson_type_option_id);
	if (filters.lesson_type_id) next = next.eq('lesson_type_id', filters.lesson_type_id);
	return next;
}

async function loadCatalogOptions(
	admin: SupabaseClient,
	filters: { lesson_type_id?: string; lesson_type_option_id?: string } = {},
): Promise<CatalogOptionInput[]> {
	const base = admin
		.from('lesson_type_options')
		.select(
			'id, lesson_type_id, duration_minutes, frequency, price_per_lesson_youth_cents, price_per_lesson_adult_cents, lesson_types(name, is_active)',
		);
	const { data, error } = await applyCatalogOptionFilters(base, filters);
	if (error) throw new Error(`Kon lesopties niet laden: ${error.message}`);
	return ((data ?? []) as OptionDbRow[]).map(mapCatalogOptionRow);
}

/** Sync active lesson_type_options to Stripe Products/Prices (no DB price-id columns). */
export async function runCatalogSync(
	admin: SupabaseClient,
	stripe: Stripe,
	filters: { lesson_type_id?: string; lesson_type_option_id?: string } = {},
): Promise<CatalogSyncResultRow[]> {
	const options = await loadCatalogOptions(admin, filters);
	const results: CatalogSyncResultRow[] = [];
	for (const option of options) {
		results.push(await syncOneOption(stripe, option));
	}
	return results;
}

export async function listAgreementsNeedingRebuild(admin: SupabaseClient, lessonTypeId: string): Promise<string[]> {
	const { data, error } = await admin
		.from('lesson_agreements')
		.select('id')
		.eq('lesson_type_id', lessonTypeId)
		.eq('is_active', true)
		.not('stripe_schedule_id', 'is', null);
	if (error) throw new Error(`Kon overeenkomsten niet laden: ${error.message}`);
	return (data ?? []).map((row) => row.id as string);
}
