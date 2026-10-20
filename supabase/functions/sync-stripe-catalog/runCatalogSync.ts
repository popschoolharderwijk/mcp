import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type Stripe from 'npm:stripe@17.5.0';
import { getSafeErrorMessage } from '../_shared/errors.ts';
import {
	buildPriceCreateParams,
	buildProductName,
	type ExistingPrice,
	type ExistingProduct,
	isPlanEmpty,
	type OptionInput,
	planCatalogSync,
	TAX_RATE_PARAMS,
	type TaxRateKey,
} from './catalogPure.ts';

export interface CatalogResult {
	lesson_type_option_id: string | null;
	name: string;
	status: 'in_sync' | 'no_tariff' | 'archived' | 'error';
	changed: boolean;
	error?: string;
}

interface CatalogRow {
	id: string;
	lesson_type_option_id: string | null;
	stripe_product_id: string | null;
	product_name: string | null;
}

type OptionDbRow = {
	id: string;
	lesson_type_id: string;
	duration_minutes: number;
	frequency: string;
	label: string | null;
	billing_kind: 'monthly' | 'one_off';
	has_adult_tariff: boolean;
	lesson_types: { name: string; is_active: boolean } | null;
	lesson_type_option_tariffs: OptionInput['tariffs'];
};

function todayIso(): string {
	return new Date().toISOString().slice(0, 10);
}

export async function ensureTaxRates(admin: SupabaseClient, stripe: Stripe): Promise<void> {
	const { data: settings } = await admin
		.from('accounting_settings')
		.select('stripe_tax_rate_21_id, stripe_tax_rate_exempt_id')
		.eq('id', true)
		.maybeSingle();
	if (settings?.stripe_tax_rate_21_id && settings?.stripe_tax_rate_exempt_id) return;

	const found: Partial<Record<TaxRateKey, string>> = {};
	for await (const rate of stripe.taxRates.list({ active: true, limit: 100 })) {
		const key = rate.metadata?.mcp_key as TaxRateKey | undefined;
		if (key && !found[key]) found[key] = rate.id;
	}
	for (const key of ['nl_21_incl', 'exempt'] as const) {
		if (!found[key]) {
			const created = await stripe.taxRates.create(TAX_RATE_PARAMS[key] as Stripe.TaxRateCreateParams, {
				idempotencyKey: `mcp_tax_rate_${key}`,
			});
			found[key] = created.id;
		}
	}
	await admin
		.from('accounting_settings')
		.update({ stripe_tax_rate_21_id: found.nl_21_incl, stripe_tax_rate_exempt_id: found.exempt })
		.eq('id', true);
}

function toOptionInput(row: OptionDbRow): OptionInput {
	return {
		id: row.id,
		lesson_type_name: row.lesson_types?.name ?? 'Lessoort',
		lesson_type_active: row.lesson_types?.is_active ?? false,
		duration_minutes: row.duration_minutes,
		frequency: row.frequency,
		label: row.label,
		billing_kind: row.billing_kind,
		has_adult_tariff: row.has_adult_tariff,
		tariffs: row.lesson_type_option_tariffs ?? [],
	};
}

async function findStripeProduct(stripe: Stripe, row: CatalogRow | undefined, optionId: string | null) {
	if (row?.stripe_product_id) {
		try {
			return await stripe.products.retrieve(row.stripe_product_id);
		} catch {
			// fall through to search
		}
	}
	if (!optionId) return null;
	const found = await stripe.products.search({ query: `metadata['lesson_type_option_id']:'${optionId}'`, limit: 1 });
	return found.data[0] ?? null;
}

async function listStripePrices(stripe: Stripe, productId: string): Promise<ExistingPrice[]> {
	const prices: ExistingPrice[] = [];
	for await (const p of stripe.prices.list({ product: productId, limit: 100 })) {
		prices.push({ stripe_price_id: p.id, lookup_key: p.lookup_key, active: p.active });
	}
	return prices;
}

async function syncOne(
	admin: SupabaseClient,
	stripe: Stripe,
	option: OptionInput | null,
	row: CatalogRow | undefined,
): Promise<CatalogResult> {
	const optionId = option?.id ?? row?.lesson_type_option_id ?? null;
	const name = option ? buildProductName(option) : (row?.product_name ?? 'Verwijderde lesvorm');
	const today = todayIso();

	const stripeProduct = await findStripeProduct(stripe, row, optionId);
	const existingProduct: ExistingProduct | null = stripeProduct
		? { stripe_product_id: stripeProduct.id, name: stripeProduct.name, active: stripeProduct.active }
		: null;
	const existingPrices = stripeProduct ? await listStripePrices(stripe, stripeProduct.id) : [];
	const plan = planCatalogSync(option, existingProduct, existingPrices, today);

	let productId = stripeProduct?.id ?? null;
	if (plan.createProduct && option) {
		const created = await stripe.products.create(
			{ name, metadata: { lesson_type_option_id: option.id }, tax_code: undefined },
			{ idempotencyKey: `mcp_product_${option.id}` },
		);
		productId = created.id;
	} else if (productId && plan.productUpdate) {
		await stripe.products.update(productId, plan.productUpdate);
	}

	const priceRows: Array<Record<string, unknown>> = [];
	if (productId && option) {
		for (const price of plan.createPrices) {
			const created = await stripe.prices.create(buildPriceCreateParams(productId, option.id, price), {
				idempotencyKey: price.lookup_key,
			});
			priceRows.push({ ...pricePersist(price), stripe_price_id: created.id, is_active_in_stripe: true });
		}
	}
	for (const id of plan.reactivatePriceIds) await stripe.prices.update(id, { active: true });
	for (const id of plan.archivePriceIds) await stripe.prices.update(id, { active: false });

	const productActive = productId ? (plan.productUpdate?.active ?? existingProduct?.active ?? true) : false;
	const hasPrices = option !== null && productId !== null && productActive;

	// Persist catalog row.
	let catalogId = row?.id ?? null;
	if (productId || row) {
		const payload = {
			lesson_type_option_id: option?.id ?? null,
			stripe_product_id: productId,
			product_name: name,
			is_active_in_stripe: productActive,
			sync_status: 'in_sync',
			last_synced_at: new Date().toISOString(),
			last_error: null,
		};
		const query = catalogId
			? admin.from('stripe_catalog_products').update(payload).eq('id', catalogId).select('id').single()
			: admin.from('stripe_catalog_products').insert(payload).select('id').single();
		const { data, error } = await query;
		if (error) throw new Error('Opslaan catalogus mislukt');
		catalogId = data.id;
	}
	if (catalogId && priceRows.length > 0) {
		await admin
			.from('stripe_catalog_prices')
			.upsert(
				priceRows.map((p) => ({ ...p, catalog_product_id: catalogId })),
				{ onConflict: 'lookup_key' },
			);
	}
	if (plan.archivePriceIds.length > 0) {
		await admin.from('stripe_catalog_prices').update({ is_active_in_stripe: false }).in('stripe_price_id', plan.archivePriceIds);
	}
	if (plan.reactivatePriceIds.length > 0) {
		await admin.from('stripe_catalog_prices').update({ is_active_in_stripe: true }).in('stripe_price_id', plan.reactivatePriceIds);
	}

	const status: CatalogResult['status'] = !option
		? 'archived'
		: !productId
			? 'no_tariff'
			: hasPrices
				? 'in_sync'
				: productActive
					? 'in_sync'
					: plan.createPrices.length === 0 && existingPrices.length === 0 && !option.lesson_type_active
						? 'archived'
						: option.lesson_type_active
							? 'no_tariff'
							: 'archived';
	return { lesson_type_option_id: optionId, name, status, changed: !isPlanEmpty(plan) };
}

function pricePersist(price: ReturnType<typeof planCatalogSync>['createPrices'][number]) {
	return {
		tariff_id: price.tariff_id,
		age_category: price.age_category,
		amount_cents: price.amount_cents,
		recurring: price.recurring,
		lookup_key: price.lookup_key,
	};
}

export async function runCatalogSync(
	admin: SupabaseClient,
	stripe: Stripe,
	lessonTypeId: string | undefined,
): Promise<CatalogResult[]> {
	await ensureTaxRates(admin, stripe);

	let optionQuery = admin
		.from('lesson_type_options')
		.select(
			'id, lesson_type_id, duration_minutes, frequency, label, billing_kind, has_adult_tariff, lesson_types(name, is_active), lesson_type_option_tariffs(id, effective_from, amount_under_21_cents, amount_adult_cents)',
		);
	if (lessonTypeId) optionQuery = optionQuery.eq('lesson_type_id', lessonTypeId);
	const { data: optionRows, error: optErr } = await optionQuery;
	if (optErr) throw new Error('Lesvormen laden mislukt');
	const options = ((optionRows ?? []) as unknown as OptionDbRow[]).map(toOptionInput);

	const { data: catalogRows, error: catErr } = await admin
		.from('stripe_catalog_products')
		.select('id, lesson_type_option_id, stripe_product_id, product_name');
	if (catErr) throw new Error('Catalogus laden mislukt');
	const rows = (catalogRows ?? []) as CatalogRow[];
	const byOption = new Map(rows.filter((r) => r.lesson_type_option_id).map((r) => [r.lesson_type_option_id, r]));
	const orphans = rows.filter((r) => !r.lesson_type_option_id);

	const results: CatalogResult[] = [];
	const work: Array<[OptionInput | null, CatalogRow | undefined]> = [
		...options.map((o) => [o, byOption.get(o.id)] as [OptionInput, CatalogRow | undefined]),
		...orphans.map((r) => [null, r] as [null, CatalogRow]),
	];
	for (const [option, row] of work) {
		try {
			results.push(await syncOne(admin, stripe, option, row));
		} catch (err) {
			const message = getSafeErrorMessage(err, 'Synchronisatie mislukt');
			console.error('sync-stripe-catalog item error', option?.id ?? row?.id, err);
			if (row) {
				await admin.from('stripe_catalog_products').update({ sync_status: 'error', last_error: message }).eq('id', row.id);
			} else if (option) {
				await admin
					.from('stripe_catalog_products')
					.insert({ lesson_type_option_id: option.id, product_name: buildProductName(option), sync_status: 'error', last_error: message });
			}
			results.push({
				lesson_type_option_id: option?.id ?? row?.lesson_type_option_id ?? null,
				name: option ? buildProductName(option) : (row?.product_name ?? ''),
				status: 'error',
				changed: false,
				error: message,
			});
		}
	}

	if (!lessonTypeId) {
		await admin.from('accounting_settings').update({ stripe_catalog_last_full_sync_at: new Date().toISOString() }).eq('id', true);
	}
	return results;
}
