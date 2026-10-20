import { describe, expect, it } from 'bun:test';
import {
	buildPaymentMethodMap,
	collectAgreementIds,
	excludeStripeAgreementItems,
	isStripeAgreement,
	resolveNotStripeAgreementFailure,
} from '../../../supabase/functions/_shared/paymentMethodPure';

const STRIPE_AGREEMENT = 'agr-stripe';
const SEPA_AGREEMENT = 'agr-sepa';
const MANUAL_AGREEMENT = 'agr-manual';

const paymentMethods = buildPaymentMethodMap([
	{ id: STRIPE_AGREEMENT, payment_method: 'stripe' },
	{ id: SEPA_AGREEMENT, payment_method: 'sepa' },
	{ id: MANUAL_AGREEMENT, payment_method: 'manual' },
]);

describe('isStripeAgreement', () => {
	it('is true only for stripe', () => {
		expect(isStripeAgreement('stripe')).toBe(true);
		expect(isStripeAgreement('sepa')).toBe(false);
		expect(isStripeAgreement('manual')).toBe(false);
		expect(isStripeAgreement(null)).toBe(false);
	});
});

describe('excludeStripeAgreementItems (no double payment)', () => {
	it('removes batch items of agreements paid via Stripe', () => {
		const items = [
			{ id: '1', lesson_agreement_id: STRIPE_AGREEMENT },
			{ id: '2', lesson_agreement_id: SEPA_AGREEMENT },
		];
		expect(excludeStripeAgreementItems(items, paymentMethods).map((i) => i.id)).toEqual(['2']);
	});

	it('keeps SEPA, manual and items without agreement', () => {
		const items = [
			{ id: '1', lesson_agreement_id: SEPA_AGREEMENT },
			{ id: '2', lesson_agreement_id: MANUAL_AGREEMENT },
			{ id: '3', lesson_agreement_id: null },
		];
		expect(excludeStripeAgreementItems(items, paymentMethods)).toHaveLength(3);
	});

	it('returns nothing when the batch contains only Stripe agreements', () => {
		expect(
			excludeStripeAgreementItems([{ id: '1', lesson_agreement_id: STRIPE_AGREEMENT }], paymentMethods),
		).toEqual([]);
	});
});

describe('resolveNotStripeAgreementFailure', () => {
	it('allows Stripe actions only for Stripe agreements', () => {
		expect(resolveNotStripeAgreementFailure('stripe')).toBeNull();
		expect(resolveNotStripeAgreementFailure('sepa')?.status).toBe(409);
		expect(resolveNotStripeAgreementFailure('manual')?.status).toBe(409);
	});
});

describe('collectAgreementIds', () => {
	it('returns unique non-null agreement ids', () => {
		expect(
			collectAgreementIds([
				{ lesson_agreement_id: 'a' },
				{ lesson_agreement_id: 'a' },
				{ lesson_agreement_id: null },
				{ lesson_agreement_id: 'b' },
			]),
		).toEqual(['a', 'b']);
	});
});

describe('resolveOneOffAgreementFailure', () => {
	it('group lessons get no Stripe subscription', () => {
		expect(resolveOneOffAgreementFailure('one_off')?.status).toBe(409);
		expect(resolveOneOffAgreementFailure('monthly')).toBeNull();
	});
	it('reads billing_kind from an embedded option', () => {
		expect(readBillingKind({ billing_kind: 'one_off' })).toBe('one_off');
		expect(readBillingKind([{ billing_kind: 'monthly' }])).toBe('monthly');
		expect(readBillingKind(null)).toBeNull();
	});
});
