import { describe, expect, it } from 'bun:test';
import {
	buildDesiredPrices,
	buildLookupKey,
	buildPriceCreateParams,
	buildProductName,
	isPlanEmpty,
	type OptionInput,
	planCatalogSync,
	resolveCatalogStatus,
	selectActiveTariffs,
} from '../../../supabase/functions/sync-stripe-catalog/catalogPure';

const TODAY = '2026-10-20';

function option(overrides: Partial<OptionInput> = {}): OptionInput {
	return {
		id: 'opt-1',
		lesson_type_name: 'Gitaar',
		lesson_type_active: true,
		duration_minutes: 30,
		frequency: 'weekly',
		label: null,
		billing_kind: 'monthly',
		has_adult_tariff: true,
		tariffs: [{ id: 't1', effective_from: '2026-09-01', amount_under_21_cents: 7338, amount_adult_cents: 8879 }],
		...overrides,
	};
}

describe('buildProductName', () => {
	it('lesson type, duration and frequency', () => {
		expect(buildProductName(option())).toBe('Gitaar · 30 min · wekelijks');
	});
	it('biweekly with label', () => {
		expect(buildProductName(option({ frequency: 'biweekly', label: 'Duo' }))).toBe(
			'Gitaar · 30 min · tweewekelijks · Duo',
		);
	});
	it('one-off group lesson', () => {
		expect(buildProductName(option({ lesson_type_name: 'Klank en Kriebels', billing_kind: 'one_off' }))).toBe(
			'Klank en Kriebels · eenmalig',
		);
	});
});

describe('buildLookupKey', () => {
	it('is deterministic and changes with the amount', () => {
		expect(buildLookupKey('opt-1', '2026-09-01', 'adult', 8879)).toBe('mcp_opt_opt-1_2026-09-01_adult_8879');
		expect(buildLookupKey('opt-1', '2026-09-01', 'adult', 8879)).not.toBe(
			buildLookupKey('opt-1', '2026-09-01', 'adult', 8900),
		);
	});
});

describe('desired prices', () => {
	it('private lesson: two monthly prices with tax keys', () => {
		const prices = buildDesiredPrices(option(), TODAY);
		expect(prices.map((p) => [p.age_category, p.amount_cents, p.recurring, p.tax_rate_key])).toEqual([
			['under_21', 7338, true, 'exempt'],
			['adult', 8879, true, 'nl_21_incl'],
		]);
	});
	it('Popkids: only under-21 price when there is no adult tariff', () => {
		const prices = buildDesiredPrices(
			option({
				has_adult_tariff: false,
				tariffs: [
					{ id: 't', effective_from: '2026-09-01', amount_under_21_cents: 2455, amount_adult_cents: null },
				],
			}),
			TODAY,
		);
		expect(prices.map((p) => p.age_category)).toEqual(['under_21']);
	});
	it('Laatbloeiers: only an adult one-off price', () => {
		const prices = buildDesiredPrices(
			option({
				billing_kind: 'one_off',
				tariffs: [
					{ id: 't', effective_from: '2026-09-01', amount_under_21_cents: null, amount_adult_cents: 8250 },
				],
			}),
			TODAY,
		);
		expect(prices).toHaveLength(1);
		expect(prices[0]).toMatchObject({ age_category: 'adult', amount_cents: 8250, recurring: false });
	});
	it('expired tariff drops out, future tariff stays', () => {
		const tariffs = [
			{ id: 'old', effective_from: '2025-09-01', amount_under_21_cents: 7000, amount_adult_cents: 8500 },
			{ id: 'cur', effective_from: '2026-09-01', amount_under_21_cents: 7338, amount_adult_cents: 8879 },
			{ id: 'new', effective_from: '2027-09-01', amount_under_21_cents: 7500, amount_adult_cents: 9075 },
		];
		expect(selectActiveTariffs(tariffs, TODAY).map((t) => t.id)).toEqual(['cur', 'new']);
	});
	it('price params are tax inclusive with exact list amount', () => {
		const [, adult] = buildDesiredPrices(option(), TODAY);
		const params = buildPriceCreateParams('prod_1', 'opt-1', adult);
		expect(params).toMatchObject({
			unit_amount: 8879,
			currency: 'eur',
			tax_behavior: 'inclusive',
			recurring: { interval: 'month' },
		});
	});
});

describe('planCatalogSync', () => {
	const product = { stripe_product_id: 'prod_1', name: 'Gitaar · 30 min · wekelijks', active: true };
	const key = (cat: 'under_21' | 'adult', amount: number) => buildLookupKey('opt-1', '2026-09-01', cat, amount);

	it('nothing to do when Stripe matches', () => {
		const plan = planCatalogSync(
			option(),
			product,
			[
				{ stripe_price_id: 'p1', lookup_key: key('under_21', 7338), active: true },
				{ stripe_price_id: 'p2', lookup_key: key('adult', 8879), active: true },
			],
			TODAY,
		);
		expect(isPlanEmpty(plan)).toBe(true);
	});
	it('creates product and prices when missing', () => {
		const plan = planCatalogSync(option(), null, [], TODAY);
		expect(plan.createProduct).toBe(true);
		expect(plan.createPrices).toHaveLength(2);
	});
	it('changed amount: new price, old one archived', () => {
		const plan = planCatalogSync(
			option(),
			product,
			[
				{ stripe_price_id: 'p1', lookup_key: key('under_21', 7338), active: true },
				{ stripe_price_id: 'p_old', lookup_key: key('adult', 8800), active: true },
			],
			TODAY,
		);
		expect(plan.createPrices.map((p) => p.amount_cents)).toEqual([8879]);
		expect(plan.archivePriceIds).toEqual(['p_old']);
	});
	it('reactivates an archived price instead of duplicating it', () => {
		const plan = planCatalogSync(
			option(),
			product,
			[
				{ stripe_price_id: 'p1', lookup_key: key('under_21', 7338), active: false },
				{ stripe_price_id: 'p2', lookup_key: key('adult', 8879), active: true },
			],
			TODAY,
		);
		expect(plan.createPrices).toHaveLength(0);
		expect(plan.reactivatePriceIds).toEqual(['p1']);
	});
	it('updates the product name', () => {
		const plan = planCatalogSync(option({ label: 'Rock' }), product, [], TODAY);
		expect(plan.productUpdate).toEqual({ name: 'Gitaar · 30 min · wekelijks · Rock' });
	});
	it('archives product and prices when the lesson type is inactive', () => {
		const plan = planCatalogSync(
			option({ lesson_type_active: false }),
			product,
			[{ stripe_price_id: 'p1', lookup_key: key('under_21', 7338), active: true }],
			TODAY,
		);
		expect(plan.productUpdate).toEqual({ active: false });
		expect(plan.archivePriceIds).toEqual(['p1']);
	});
	it('archives orphan product (lesson form deleted)', () => {
		const plan = planCatalogSync(null, product, [{ stripe_price_id: 'p1', lookup_key: 'x', active: true }], TODAY);
		expect(plan.productUpdate).toEqual({ active: false });
		expect(plan.archivePriceIds).toEqual(['p1']);
	});
	it('no product for a lesson form without tariff', () => {
		const plan = planCatalogSync(option({ tariffs: [] }), null, [], TODAY);
		expect(isPlanEmpty(plan)).toBe(true);
		expect(resolveCatalogStatus(option({ tariffs: [] }), TODAY)).toBe('no_tariff');
	});
});
