import { describe, expect, it } from 'bun:test';
import {
	readStripeWebhookEnv,
	validateStripeWebhookRequest,
} from '../../../supabase/functions/_shared/stripeWebhookRequestHelpers';

describe('validateStripeWebhookRequest', () => {
	it('returns ok when signature and secret are present', () => {
		expect(validateStripeWebhookRequest('sig', 'secret')).toEqual({ ok: true });
	});

	it('returns error when signature or secret is missing', () => {
		expect(validateStripeWebhookRequest(null, 'secret')).toEqual({
			ok: false,
			status: 400,
			error: 'Missing signature/secret',
		});
		expect(validateStripeWebhookRequest('sig', undefined)).toEqual({
			ok: false,
			status: 400,
			error: 'Missing signature/secret',
		});
	});
});

describe('readStripeWebhookEnv', () => {
	it('reads stripe webhook environment values', () => {
		const env = new Map([
			['SUPABASE_URL', 'https://example.supabase.co'],
			['SUPABASE_SERVICE_ROLE_KEY', 'service-key'],
			['STRIPE_WEBHOOK_SECRET', 'whsec_test'],
		]);
		expect(readStripeWebhookEnv((key) => env.get(key))).toEqual({
			supabaseUrl: 'https://example.supabase.co',
			serviceKey: 'service-key',
			webhookSecret: 'whsec_test',
		});
	});
});
