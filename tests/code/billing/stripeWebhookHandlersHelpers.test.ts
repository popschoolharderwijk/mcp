import { describe, expect, it } from 'bun:test';
import {
	buildSubscriptionInvoiceUpsertRow,
	extractStripeSubscriptionId,
	hasScheduleSetupInput,
	isScheduleSetupCheckoutSession,
	isScheduleSetupIntent,
	isStripeWebhookCheckoutAction,
	isStripeWebhookDataAction,
	resolveSetupIntentId,
	resolveStripeWebhookAction,
	shouldHandleSubscriptionCheckout,
	shouldProcessSetupCheckoutSession,
	stripeUnixTimestampToIso,
} from '../../../supabase/functions/_shared/stripeWebhookHandlersHelpers';

const SUBSCRIPTION_ID = '11111111-1111-1111-1111-111111111111';

describe('extractStripeSubscriptionId', () => {
	it('returns string subscription ids unchanged', () => {
		expect(extractStripeSubscriptionId('sub_123')).toBe('sub_123');
	});

	it('returns the id from expanded subscription objects', () => {
		expect(extractStripeSubscriptionId({ id: 'sub_456' })).toBe('sub_456');
	});

	it('returns null when subscription is missing', () => {
		expect(extractStripeSubscriptionId(null)).toBeNull();
	});
});

describe('stripeUnixTimestampToIso', () => {
	it('converts unix timestamps to iso strings', () => {
		expect(stripeUnixTimestampToIso(1_700_000_000)).toBe('2023-11-14T22:13:20.000Z');
	});

	it('returns null for missing timestamps', () => {
		expect(stripeUnixTimestampToIso(null)).toBeNull();
	});
});

describe('buildSubscriptionInvoiceUpsertRow', () => {
	it('maps stripe invoice fields to the upsert payload', () => {
		expect(
			buildSubscriptionInvoiceUpsertRow(SUBSCRIPTION_ID, {
				id: 'in_123',
				amount_due: 2500,
				amount_paid: 2500,
				currency: 'eur',
				status: 'paid',
				hosted_invoice_url: 'https://stripe.example/invoice',
				invoice_pdf: 'https://stripe.example/invoice.pdf',
				period_start: 1_700_000_000,
				period_end: 1_702_000_000,
				status_transitions: { paid_at: 1_700_100_000 },
			}),
		).toEqual({
			subscription_id: SUBSCRIPTION_ID,
			stripe_invoice_id: 'in_123',
			amount_due: 2500,
			amount_paid: 2500,
			currency: 'eur',
			status: 'paid',
			hosted_invoice_url: 'https://stripe.example/invoice',
			invoice_pdf: 'https://stripe.example/invoice.pdf',
			period_start: '2023-11-14T22:13:20.000Z',
			period_end: '2023-12-08T01:46:40.000Z',
			paid_at: '2023-11-16T02:00:00.000Z',
		});
	});
});

describe('isScheduleSetupCheckoutSession', () => {
	it('returns true for schedule setup checkout sessions', () => {
		expect(isScheduleSetupCheckoutSession({ mode: 'setup', metadata: { flow: 'schedule_setup' } })).toBe(true);
	});

	it('returns false for other checkout sessions', () => {
		expect(isScheduleSetupCheckoutSession({ mode: 'subscription', metadata: { flow: 'schedule_setup' } })).toBe(
			false,
		);
	});
});

describe('isScheduleSetupIntent', () => {
	it('returns true for schedule setup intents', () => {
		expect(isScheduleSetupIntent({ metadata: { flow: 'schedule_setup' } })).toBe(true);
	});

	it('returns false for other setup intents', () => {
		expect(isScheduleSetupIntent({ metadata: { flow: 'other' } })).toBe(false);
	});
});

describe('hasScheduleSetupInput', () => {
	it('returns true when all setup fields are present', () => {
		expect(
			hasScheduleSetupInput({
				lessonAgreementId: 'agr-1',
				customerId: 'cus-1',
				paymentMethodId: 'pm-1',
			}),
		).toBe(true);
	});

	it('returns false when any setup field is missing', () => {
		expect(
			hasScheduleSetupInput({
				lessonAgreementId: 'agr-1',
				customerId: null,
				paymentMethodId: 'pm-1',
			}),
		).toBe(false);
	});
});

describe('resolveStripeWebhookAction', () => {
	it('maps subscription events to upsert_subscription', () => {
		expect(resolveStripeWebhookAction('customer.subscription.updated')).toBe('upsert_subscription');
	});

	it('maps checkout and setup events', () => {
		expect(resolveStripeWebhookAction('checkout.session.completed')).toBe('checkout_session_completed');
		expect(resolveStripeWebhookAction('setup_intent.succeeded')).toBe('setup_intent_succeeded');
	});

	it('maps invoice events to upsert_invoice', () => {
		expect(resolveStripeWebhookAction('invoice.paid')).toBe('upsert_invoice');
	});

	it('returns noop for unknown events', () => {
		expect(resolveStripeWebhookAction('customer.created')).toBe('noop');
	});
});

describe('shouldHandleSubscriptionCheckout', () => {
	it('returns true for subscription checkout sessions', () => {
		expect(shouldHandleSubscriptionCheckout({ mode: 'subscription', subscription: { id: 'sub_123' } })).toBe(true);
	});

	it('returns false for setup checkout sessions', () => {
		expect(shouldHandleSubscriptionCheckout({ mode: 'setup', subscription: null })).toBe(false);
	});
});

describe('resolveSetupIntentId', () => {
	it('returns string setup intent ids unchanged', () => {
		expect(resolveSetupIntentId('seti_123')).toBe('seti_123');
	});

	it('returns the id from expanded setup intent objects', () => {
		expect(resolveSetupIntentId({ id: 'seti_456' })).toBe('seti_456');
	});
});

describe('shouldProcessSetupCheckoutSession', () => {
	it('returns true for schedule setup checkout sessions', () => {
		expect(shouldProcessSetupCheckoutSession({ mode: 'setup', metadata: { flow: 'schedule_setup' } })).toBe(true);
	});

	it('returns false for other checkout sessions', () => {
		expect(shouldProcessSetupCheckoutSession({ mode: 'subscription', metadata: { flow: 'schedule_setup' } })).toBe(
			false,
		);
	});
});

describe('isStripeWebhookDataAction', () => {
	it('returns true for subscription and invoice actions', () => {
		expect(isStripeWebhookDataAction('upsert_subscription')).toBe(true);
		expect(isStripeWebhookDataAction('upsert_invoice')).toBe(true);
	});

	it('returns false for checkout actions', () => {
		expect(isStripeWebhookDataAction('checkout_session_completed')).toBe(false);
	});
});

describe('isStripeWebhookCheckoutAction', () => {
	it('returns true for checkout and setup intent actions', () => {
		expect(isStripeWebhookCheckoutAction('checkout_session_completed')).toBe(true);
		expect(isStripeWebhookCheckoutAction('setup_intent_succeeded')).toBe(true);
	});

	it('returns false for subscription actions', () => {
		expect(isStripeWebhookCheckoutAction('upsert_subscription')).toBe(false);
	});
});
