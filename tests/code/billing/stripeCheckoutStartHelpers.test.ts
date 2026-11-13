import { describe, expect, it } from 'bun:test';
import {
	resolveCheckoutCompletePollStatus,
	runStripeCheckoutStartFlow,
} from '../../../src/lib/stripe/stripeCheckoutStartHelpers';

describe('resolveCheckoutCompletePollStatus', () => {
	it('classifies complete poll payloads', () => {
		expect(resolveCheckoutCompletePollStatus({ schedule_id: 'sched_1', pending: false })).toBe('success');
		expect(resolveCheckoutCompletePollStatus({ pending: true })).toBe('pending');
		expect(resolveCheckoutCompletePollStatus({})).toBe('invalid');
		expect(resolveCheckoutCompletePollStatus(null)).toBe('invalid');
	});
});

describe('runStripeCheckoutStartFlow', () => {
	const baseDeps = {
		readMagicLinkUrlError: () => null,
		consumeMagicLinkFromUrl: async () => ({ ok: true }),
		getSession: async () => ({ session: { id: 'session-1' } }),
		invokeCreateSubscriptionCheckout: async () => ({
			data: { url: 'https://checkout.stripe.com/pay/cs_test' },
			error: null,
		}),
		getFunctionErrorMessage: async (_data: unknown, _error: unknown, fallback: string) => fallback,
		sleep: async () => undefined,
	};

	it('returns error when agreement id is missing', async () => {
		const result = await runStripeCheckoutStartFlow(new URLSearchParams(''), baseDeps);
		expect(result).toEqual({
			status: 'error',
			message: 'Ongeldige uitnodigingslink (overeenkomst ontbreekt).',
		});
	});

	it('returns error when magic link hash contains an error', async () => {
		const result = await runStripeCheckoutStartFlow(new URLSearchParams('agreement=agr-1'), {
			...baseDeps,
			readMagicLinkUrlError: () => 'Hash error',
		});
		expect(result).toEqual({ status: 'error', message: 'Hash error' });
	});

	it('returns error when magic link consumption fails', async () => {
		const result = await runStripeCheckoutStartFlow(new URLSearchParams('agreement=agr-1'), {
			...baseDeps,
			consumeMagicLinkFromUrl: async () => ({ ok: false, error: 'Link expired' }),
		});
		expect(result).toEqual({ status: 'error', message: 'Link expired' });
	});

	it('returns error when session is missing', async () => {
		const result = await runStripeCheckoutStartFlow(new URLSearchParams('agreement=agr-1'), {
			...baseDeps,
			getSession: async () => ({ session: null }),
		});
		expect(result).toEqual({
			status: 'error',
			message: 'Geen actieve sessie. Open de link uit de mail opnieuw.',
		});
	});

	it('returns redirect url for checkout mode', async () => {
		const result = await runStripeCheckoutStartFlow(new URLSearchParams('agreement=agr-1'), baseDeps);
		expect(result).toEqual({ status: 'redirect', url: 'https://checkout.stripe.com/pay/cs_test' });
	});

	it('polls complete mode until the webhook schedule id appears', async () => {
		let calls = 0;
		const result = await runStripeCheckoutStartFlow(new URLSearchParams('agreement=agr-1&session_id=cs_1'), {
			...baseDeps,
			maxPollAttempts: 3,
			invokeCreateSubscriptionCheckout: async () => {
				calls += 1;
				if (calls < 2) return { data: { mode: 'complete', pending: true }, error: null };
				return { data: { mode: 'complete', pending: false, schedule_id: 'sched_1' }, error: null };
			},
		});
		expect(result).toEqual({ status: 'success' });
		expect(calls).toBe(2);
	});

	it('returns timeout when complete mode stays pending', async () => {
		const result = await runStripeCheckoutStartFlow(new URLSearchParams('agreement=agr-1&session_id=cs_1'), {
			...baseDeps,
			maxPollAttempts: 2,
			invokeCreateSubscriptionCheckout: async () => ({
				data: { mode: 'complete', pending: true },
				error: null,
			}),
		});
		expect(result.status).toBe('error');
		if (result.status === 'error') {
			expect(result.message).toContain('nog niet zichtbaar');
		}
	});

	it('returns invoke error message for checkout failures', async () => {
		const result = await runStripeCheckoutStartFlow(new URLSearchParams('agreement=agr-1'), {
			...baseDeps,
			invokeCreateSubscriptionCheckout: async () => ({ data: { error: 'bad request' }, error: null }),
			getFunctionErrorMessage: async () => 'Checkout failed',
		});
		expect(result).toEqual({ status: 'error', message: 'Checkout failed' });
	});

	it('returns complete fallback error for complete mode failures', async () => {
		const result = await runStripeCheckoutStartFlow(new URLSearchParams('agreement=agr-1&session_id=cs_1'), {
			...baseDeps,
			maxPollAttempts: 1,
			invokeCreateSubscriptionCheckout: async () => ({ data: null, error: new Error('failed') }),
			getFunctionErrorMessage: async (_data, _error, fallback) => fallback,
		});
		expect(result).toEqual({ status: 'error', message: 'Kon betaling niet afronden.' });
	});

	it('returns missing checkout url error when redirect url is absent', async () => {
		const result = await runStripeCheckoutStartFlow(new URLSearchParams('agreement=agr-1'), {
			...baseDeps,
			invokeCreateSubscriptionCheckout: async () => ({ data: {}, error: null }),
		});
		expect(result).toEqual({ status: 'error', message: 'Geen checkout-URL ontvangen.' });
	});

	it('returns checkout fallback when invoke fails without custom message', async () => {
		const result = await runStripeCheckoutStartFlow(new URLSearchParams('agreement=agr-1'), {
			...baseDeps,
			invokeCreateSubscriptionCheckout: async () => ({ data: null, error: new Error('failed') }),
			getFunctionErrorMessage: async (_data, _error, fallback) => fallback,
		});
		expect(result).toEqual({ status: 'error', message: 'Kon betaling niet starten.' });
	});
});
