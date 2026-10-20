import { describe, expect, it } from 'bun:test';
import {
	CUSTOMER_DIRECT_DEBIT_ERROR,
	isStripeResourceMissing,
	isUsableTaxRate,
	looksLikeRawStripeError,
	missingStripeResource,
	retrieveIfExists,
	staleCatalogPriceIds,
	toScheduleError,
} from '../../../supabase/functions/_shared/stripeRecoveryPure';
import { toCustomerDirectDebitMessage } from '../../../src/lib/direct-debit/directDebitStartHelpers';

const missing = (message: string, param?: string) =>
	Object.assign(new Error(message), { code: 'resource_missing', ...(param ? { param } : {}) });

describe('isStripeResourceMissing / missingStripeResource', () => {
	it('recognises a tax rate from another account', () => {
		const err = missing("No such tax rate: 'txr_1USf0L9z8iTY4J0u74ihZ4Tn'");
		expect(isStripeResourceMissing(err)).toBe(true);
		expect(missingStripeResource(err)).toBe('tax_rate');
	});
	it('recognises price, product, customer and portal configuration', () => {
		expect(missingStripeResource(missing("No such price: 'price_123'"))).toBe('price');
		expect(missingStripeResource(missing("No such product: 'prod_123'"))).toBe('product');
		expect(missingStripeResource(missing("No such customer: 'cus_123'"))).toBe('customer');
		expect(missingStripeResource(missing("No such configuration: 'bpc_123'"))).toBe('portal');
	});
	it('reads the code from raw as well', () => {
		expect(isStripeResourceMissing({ raw: { code: 'resource_missing' }, message: 'x' })).toBe(true);
	});
	it('ignores other errors', () => {
		const err = Object.assign(new Error('Your card was declined'), { code: 'card_declined' });
		expect(isStripeResourceMissing(err)).toBe(false);
		expect(missingStripeResource(err)).toBeNull();
	});
});

describe('toScheduleError', () => {
	it('asks to sync with Stripe for a missing tax rate', () => {
		const err = toScheduleError(missing("No such tax rate: 'txr_1'")) as Error;
		expect(err.message).toContain('synchroniseer eerst met Stripe');
		expect(err.message).not.toContain('txr_');
	});
	it('passes other errors through unchanged', () => {
		const original = new Error('Lesovereenkomst niet gevonden');
		expect(toScheduleError(original)).toBe(original);
	});
});

describe('retrieveIfExists', () => {
	it('returns the object when it exists', async () => {
		expect(await retrieveIfExists('txr_1', async (id) => ({ id }))).toEqual({ id: 'txr_1' });
	});
	it('returns null for a stored id from another account, so it is recreated', async () => {
		expect(
			await retrieveIfExists('txr_old', async () => {
				throw missing("No such tax rate: 'txr_old'");
			}),
		).toBeNull();
	});
	it('returns null without stored id and does not call Stripe', async () => {
		let called = false;
		expect(
			await retrieveIfExists(null, async () => {
				called = true;
				return {};
			}),
		).toBeNull();
		expect(called).toBe(false);
	});
	it('rethrows other errors', async () => {
		await expect(
			retrieveIfExists('txr_1', async () => {
				throw new Error('Network down');
			}),
		).rejects.toThrow('Network down');
	});
});

describe('stored ids', () => {
	it('only reuses active tax rates', () => {
		expect(isUsableTaxRate({ active: true })).toBe(true);
		expect(isUsableTaxRate({ active: false })).toBe(false);
		expect(isUsableTaxRate(null)).toBe(false);
	});
	it('marks catalog prices that are not on the current Stripe product as stale', () => {
		expect(staleCatalogPriceIds(['price_old', 'price_new'], ['price_new'])).toEqual(['price_old']);
	});
	it('finds nothing stale on a second sync', () => {
		expect(staleCatalogPriceIds(['price_new'], ['price_new', 'price_archived'])).toEqual([]);
	});
});

describe('customer-facing messages', () => {
	it('detects raw Stripe texts', () => {
		expect(looksLikeRawStripeError("No such tax rate: 'txr_1USf0L9z8iTY4J0u74ihZ4Tn'")).toBe(true);
		expect(looksLikeRawStripeError('Geen actieve sessie. Open de link uit de mail opnieuw.')).toBe(false);
	});
	it('replaces raw Stripe texts on /direct-debit/start', () => {
		expect(toCustomerDirectDebitMessage("No such tax rate: 'txr_1USf0L9z8iTY4J0u74ihZ4Tn'")).toBe(
			CUSTOMER_DIRECT_DEBIT_ERROR,
		);
		expect(toCustomerDirectDebitMessage('Ongeldige uitnodigingslink (overeenkomst ontbreekt).')).toBe(
			'Ongeldige uitnodigingslink (overeenkomst ontbreekt).',
		);
	});
});
