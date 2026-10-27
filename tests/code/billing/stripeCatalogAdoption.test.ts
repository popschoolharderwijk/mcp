import { describe, expect, it } from 'bun:test';
import {
	type DesiredPrice,
	type LookupPrice,
	matchTaxRateKey,
	planPriceAdoption,
	priceIdempotencyKey,
} from '../../../supabase/functions/_shared/stripeCatalogPure';

const desired: DesiredPrice = {
	tariff_id: 't1',
	effective_from: '2026-08-01',
	age_category: 'under_21',
	amount_cents: 7500,
	recurring: true,
	lookup_key: 'mcp_opt1_2026-08-01_under_21_7500',
	tax_rate_key: 'exempt',
};
const stripePrice = (o: Partial<LookupPrice> = {}): LookupPrice => ({
	stripe_price_id: 'price_1',
	lookup_key: desired.lookup_key,
	product_id: 'prod_1',
	active: true,
	unit_amount: 7500,
	recurring: true,
	...o,
});

describe('planPriceAdoption', () => {
	it('adopts an existing price with same product, amount and interval', () => {
		const plan = planPriceAdoption([desired], [stripePrice()], 'prod_1');
		expect(plan.adopt).toEqual([{ price: desired, stripe_price_id: 'price_1', active: true }]);
		expect(plan.create).toEqual([]);
	});
	it('creates without transfer when the lookup key is unknown', () => {
		expect(planPriceAdoption([desired], [], 'prod_1').create).toEqual([{ price: desired, transfer: false }]);
	});
	it('transfers the lookup key when the amount differs', () => {
		const plan = planPriceAdoption([desired], [stripePrice({ unit_amount: 7000 })], 'prod_1');
		expect(plan.create).toEqual([{ price: desired, transfer: true }]);
	});
	it('transfers the lookup key when the price lives on another product', () => {
		const plan = planPriceAdoption([desired], [stripePrice({ product_id: 'prod_old' })], 'prod_1');
		expect(plan.create[0]?.transfer).toBe(true);
	});
	it('is idempotent: a second run after adoption creates nothing', () => {
		const first = planPriceAdoption([desired], [stripePrice()], 'prod_1');
		const second = planPriceAdoption([desired], [stripePrice()], 'prod_1');
		expect(second).toEqual(first);
		expect(second.create.length).toBe(0);
	});
});

describe('priceIdempotencyKey', () => {
	it('differs per product and transfer', () => {
		expect(priceIdempotencyKey('k', 'prod_a', false)).not.toBe(priceIdempotencyKey('k', 'prod_b', false));
		expect(priceIdempotencyKey('k', 'prod_a', true)).not.toBe(priceIdempotencyKey('k', 'prod_a', false));
	});
});

describe('matchTaxRateKey', () => {
	it('uses our metadata tag', () => {
		expect(
			matchTaxRateKey({ active: true, percentage: 21, inclusive: true, metadata: { mcp_key: 'nl_21_incl' } }),
		).toBe('nl_21_incl');
	});
	it('adopts untagged inclusive 21% and 0% rates', () => {
		expect(matchTaxRateKey({ active: true, percentage: 21, inclusive: true })).toBe('nl_21_incl');
		expect(matchTaxRateKey({ active: true, percentage: 0, inclusive: true })).toBe('exempt');
	});
	it('ignores exclusive, inactive or other percentages', () => {
		expect(matchTaxRateKey({ active: true, percentage: 21, inclusive: false })).toBeNull();
		expect(matchTaxRateKey({ active: false, percentage: 21, inclusive: true })).toBeNull();
		expect(matchTaxRateKey({ active: true, percentage: 9, inclusive: true })).toBeNull();
	});
});
