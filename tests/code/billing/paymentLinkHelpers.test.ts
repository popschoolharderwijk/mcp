import { describe, expect, it } from 'bun:test';
import {
	buildPaymentLinkRequestResponse,
	buildPaymentLinkUrl,
	computeMinimumTermEnd,
	generatePaymentLinkToken,
	hashPaymentLinkToken,
	isPaymentLinkRequestAllowedAddress,
	isPaymentLinkRequestRateLimited,
	isPlausiblePaymentLinkToken,
	isValidEmailInput,
	needsCatchUpInvoice,
	PAYMENT_LINK_REQUEST_MESSAGE,
	paymentLinkTokenMatches,
	resolveBillingRecipient,
} from '../../../supabase/functions/_shared/paymentLinkHelpers';

describe('payment link tokens', () => {
	it('generates a plausible token that hashes and matches', async () => {
		const token = generatePaymentLinkToken();
		expect(isPlausiblePaymentLinkToken(token)).toBe(true);
		const hash = await hashPaymentLinkToken(token);
		expect(await paymentLinkTokenMatches(token, hash)).toBe(true);
		expect(await paymentLinkTokenMatches('nope', hash)).toBe(false);
	});

	it('builds the public /pay url', () => {
		expect(buildPaymentLinkUrl('https://app.example.com/', 'agr-1', 'tok')).toBe(
			'https://app.example.com/pay?agreement=agr-1&t=tok',
		);
	});
});

describe('billing recipient and request guards', () => {
	it('prefers parent email over account email', () => {
		expect(resolveBillingRecipient({ parentEmail: ' ouder@ex.com ', accountEmail: 'kind@ex.com' })).toBe(
			'ouder@ex.com',
		);
		expect(resolveBillingRecipient({ parentEmail: null, accountEmail: 'kind@ex.com' })).toBe('kind@ex.com');
	});

	it('allows only known billing addresses', () => {
		expect(
			isPaymentLinkRequestAllowedAddress('ouder@ex.com', {
				parentEmail: 'ouder@ex.com',
				accountEmail: 'kind@ex.com',
			}),
		).toBe(true);
		expect(
			isPaymentLinkRequestAllowedAddress('other@ex.com', {
				parentEmail: 'ouder@ex.com',
				accountEmail: 'kind@ex.com',
			}),
		).toBe(false);
	});

	it('validates email input and rate limits', () => {
		expect(isValidEmailInput('a@b.nl')).toBe(true);
		expect(isValidEmailInput('bad')).toBe(false);
		expect(isPaymentLinkRequestRateLimited(2)).toBe(false);
		expect(isPaymentLinkRequestRateLimited(3)).toBe(true);
		expect(buildPaymentLinkRequestResponse()).toEqual({
			ok: true,
			message: PAYMENT_LINK_REQUEST_MESSAGE,
		});
	});
});

describe('minimum term and catch-up', () => {
	it('computes a minimum term end after six months', () => {
		expect(computeMinimumTermEnd('2026-10-15')).toBe('2027-04-30');
	});

	it('needs catch-up when start month is before today month', () => {
		expect(needsCatchUpInvoice('2026-10-01', '2026-10-20')).toBe(false);
		expect(needsCatchUpInvoice('2026-10-01', '2026-12-01')).toBe(true);
	});
});
