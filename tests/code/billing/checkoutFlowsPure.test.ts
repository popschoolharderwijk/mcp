import { describe, expect, it } from 'bun:test';
import {
	buildCheckoutSessionUrls,
	buildCompleteModeSuccessResponse,
	buildDirectModeSuccessResponse,
	buildStripeCustomerDisplayName,
	resolveDirectModePaymentMethodId,
	resolveExistingScheduleResponse,
	resolveSetupIntentPaymentMethodId,
	validateCompleteCheckoutSessionId,
	validateCompleteCheckoutSessionMatch,
	validateCompleteModePaymentReady,
} from '../../../supabase/functions/create-subscription-checkout/checkoutFlowsPure';

const AGREEMENT_ID = '11111111-1111-1111-1111-111111111111';

async function readError(response: Response): Promise<string> {
	const body = (await response.json()) as { error: string };
	return body.error;
}

describe('validateCompleteCheckoutSessionId', () => {
	it('returns null for a valid checkout session id', () => {
		expect(validateCompleteCheckoutSessionId('cs_test_123')).toBeNull();
	});

	it('returns a 400 response for an invalid checkout session id', async () => {
		const response = validateCompleteCheckoutSessionId('bad');
		expect(response?.status).toBe(400);
		expect(await readError(response as Response)).toBe('Ongeldige checkout sessie');
	});
});

describe('validateCompleteCheckoutSessionMatch', () => {
	it('returns null when the setup session matches the agreement', () => {
		expect(
			validateCompleteCheckoutSessionMatch(
				{ mode: 'setup', metadata: { lesson_agreement_id: AGREEMENT_ID } },
				AGREEMENT_ID,
			),
		).toBeNull();
	});

	it('returns a 409 response when the session does not match the agreement', async () => {
		const response = validateCompleteCheckoutSessionMatch(
			{ mode: 'subscription', metadata: { lesson_agreement_id: AGREEMENT_ID } },
			AGREEMENT_ID,
		);
		expect(response?.status).toBe(409);
		expect(await readError(response as Response)).toBe('Checkout sessie hoort niet bij deze lesovereenkomst');
	});
});

describe('resolveDirectModePaymentMethodId', () => {
	it('returns string payment method ids unchanged', () => {
		expect(resolveDirectModePaymentMethodId('pm_123')).toBe('pm_123');
	});

	it('returns the id from expanded payment method objects', () => {
		expect(resolveDirectModePaymentMethodId({ id: 'pm_456' })).toBe('pm_456');
	});

	it('returns null when no payment method is present', () => {
		expect(resolveDirectModePaymentMethodId(null)).toBeNull();
	});
});

describe('buildCheckoutSessionUrls', () => {
	const origin = 'https://mcp.mplifi.nl';

	it('builds default success and cancel urls from the origin', () => {
		expect(buildCheckoutSessionUrls(origin, AGREEMENT_ID, {})).toEqual({
			ok: true,
			successUrl: `${origin}/incasso/start?agreement=${AGREEMENT_ID}&session_id={CHECKOUT_SESSION_ID}`,
			cancelUrl: `${origin}/agreements/${AGREEMENT_ID}?subscription=canceled`,
		});
	});

	it('uses custom success and cancel urls when provided on allowed hosts', () => {
		expect(
			buildCheckoutSessionUrls(origin, AGREEMENT_ID, {
				success_url: 'https://mcp.mplifi.nl/success',
				cancel_url: 'https://mcp.mplifi.nl/cancel',
			}),
		).toEqual({
			ok: true,
			successUrl: 'https://mcp.mplifi.nl/success',
			cancelUrl: 'https://mcp.mplifi.nl/cancel',
		});
	});

	it('rejects custom success urls on disallowed hosts', () => {
		expect(
			buildCheckoutSessionUrls(origin, AGREEMENT_ID, {
				success_url: 'https://evil.example.com/success',
			}),
		).toEqual({
			ok: false,
			error: 'Ongeldige success_url',
		});
	});

	it('rejects custom cancel urls on disallowed hosts', () => {
		expect(
			buildCheckoutSessionUrls(origin, AGREEMENT_ID, {
				cancel_url: 'https://evil.example.com/cancel',
			}),
		).toEqual({
			ok: false,
			error: 'Ongeldige cancel_url',
		});
	});
});

describe('resolveExistingScheduleResponse', () => {
	it('returns null when no schedule id exists', () => {
		expect(resolveExistingScheduleResponse(null)).toBeNull();
	});

	it('returns a complete-mode response when a schedule id exists', async () => {
		const response = resolveExistingScheduleResponse('sub_sched_1');
		expect(response?.status).toBe(200);
		expect(await response?.json()).toEqual({ mode: 'complete', schedule_id: 'sub_sched_1' });
	});
});

describe('validateCompleteModePaymentReady', () => {
	it('returns null when customer and payment method are present', () => {
		expect(validateCompleteModePaymentReady('cus_1', 'pm_1')).toBeNull();
	});

	it('returns a 409 response when payment details are missing', async () => {
		const response = validateCompleteModePaymentReady(null, 'pm_1');
		expect(response?.status).toBe(409);
		expect(await readError(response as Response)).toBe('Betaalmethode is nog niet beschikbaar in Stripe');
	});
});

describe('buildStripeCustomerDisplayName', () => {
	it('joins first and last name when both are present', () => {
		expect(buildStripeCustomerDisplayName('Anna', 'Bakker')).toBe('Anna Bakker');
	});

	it('returns undefined when both names are missing', () => {
		expect(buildStripeCustomerDisplayName(null, null)).toBeUndefined();
	});
});

describe('buildCompleteModeSuccessResponse', () => {
	it('builds the complete mode success payload', async () => {
		const response = buildCompleteModeSuccessResponse({ scheduleId: 'sched_1', subscriptionId: 'sub_1' });
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			mode: 'complete',
			schedule_id: 'sched_1',
			subscription_id: 'sub_1',
		});
	});
});

describe('buildDirectModeSuccessResponse', () => {
	it('builds the direct mode success payload', async () => {
		const response = buildDirectModeSuccessResponse({
			scheduleId: 'sched_1',
			subscriptionId: 'sub_1',
			yearly: { yearlyCents: 120000, monthlyCents: 10000, lessonsCount: 36 },
			periodStart: '2026-09-01',
			periodEnd: '2027-08-31',
			tariff: 'standard',
		});
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			mode: 'direct',
			schedule_id: 'sched_1',
			subscription_id: 'sub_1',
			yearly_cents: 120000,
			monthly_cents: 10000,
			lessons_count: 36,
			period: { start: '2026-09-01', end: '2027-08-31' },
			tariff: 'standard',
		});
	});
});

describe('resolveSetupIntentPaymentMethodId', () => {
	it('extracts payment method ids from expanded setup intents', () => {
		expect(
			resolveSetupIntentPaymentMethodId(
				{ id: 'seti_1', latest_attempt: { payment_method: 'pm_1' } },
				() => 'pm_1',
			),
		).toBe('pm_1');
	});

	it('returns null for string setup intent references', () => {
		expect(resolveSetupIntentPaymentMethodId('seti_1', () => 'pm_1')).toBeNull();
	});
});
