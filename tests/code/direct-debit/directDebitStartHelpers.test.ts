import { describe, expect, it } from 'bun:test';
import { runDirectDebitStartFlow } from '../../../src/lib/direct-debit/directDebitStartHelpers';

describe('runDirectDebitStartFlow', () => {
	const baseDeps = {
		readMagicLinkUrlError: () => null,
		consumeMagicLinkFromUrl: async () => ({ ok: true }),
		getSession: async () => ({ session: { id: 'session-1' } }),
		invokeCreateSubscriptionCheckout: async () => ({
			data: { url: 'https://checkout.stripe.com/pay/cs_test' },
			error: null,
		}),
		getFunctionErrorMessage: async (_data: unknown, _error: unknown, fallback: string) => fallback,
	};

	it('returns error when agreement id is missing', async () => {
		const result = await runDirectDebitStartFlow(new URLSearchParams(''), baseDeps);
		expect(result).toEqual({
			status: 'error',
			message: 'Ongeldige uitnodigingslink (overeenkomst ontbreekt).',
		});
	});

	it('returns error when magic link hash contains an error', async () => {
		const result = await runDirectDebitStartFlow(new URLSearchParams('agreement=agr-1'), {
			...baseDeps,
			readMagicLinkUrlError: () => 'Hash error',
		});
		expect(result).toEqual({ status: 'error', message: 'Hash error' });
	});

	it('returns error when magic link consumption fails', async () => {
		const result = await runDirectDebitStartFlow(new URLSearchParams('agreement=agr-1'), {
			...baseDeps,
			consumeMagicLinkFromUrl: async () => ({ ok: false, error: 'Link expired' }),
		});
		expect(result).toEqual({ status: 'error', message: 'Link expired' });
	});

	it('returns error when session is missing', async () => {
		const result = await runDirectDebitStartFlow(new URLSearchParams('agreement=agr-1'), {
			...baseDeps,
			getSession: async () => ({ session: null }),
		});
		expect(result).toEqual({
			status: 'error',
			message: 'Geen actieve sessie. Open de link uit de mail opnieuw.',
		});
	});

	it('returns redirect url for checkout mode', async () => {
		const result = await runDirectDebitStartFlow(new URLSearchParams('agreement=agr-1'), baseDeps);
		expect(result).toEqual({ status: 'redirect', url: 'https://checkout.stripe.com/pay/cs_test' });
	});

	it('returns success for complete mode', async () => {
		const result = await runDirectDebitStartFlow(new URLSearchParams('agreement=agr-1&session_id=sess-1'), {
			...baseDeps,
			invokeCreateSubscriptionCheckout: async () => ({ data: { ok: true }, error: null }),
		});
		expect(result).toEqual({ status: 'success' });
	});

	it('returns invoke error message for checkout failures', async () => {
		const result = await runDirectDebitStartFlow(new URLSearchParams('agreement=agr-1'), {
			...baseDeps,
			invokeCreateSubscriptionCheckout: async () => ({ data: { error: 'bad request' }, error: null }),
			getFunctionErrorMessage: async () => 'Checkout failed',
		});
		expect(result).toEqual({ status: 'error', message: 'Checkout failed' });
	});

	it('returns complete fallback error for complete mode failures', async () => {
		const result = await runDirectDebitStartFlow(new URLSearchParams('agreement=agr-1&session_id=sess-1'), {
			...baseDeps,
			invokeCreateSubscriptionCheckout: async () => ({ data: null, error: new Error('failed') }),
			getFunctionErrorMessage: async (_data, _error, fallback) => fallback,
		});
		expect(result).toEqual({ status: 'error', message: 'Kon incasso niet afronden.' });
	});

	it('returns missing checkout url error when redirect url is absent', async () => {
		const result = await runDirectDebitStartFlow(new URLSearchParams('agreement=agr-1'), {
			...baseDeps,
			invokeCreateSubscriptionCheckout: async () => ({ data: {}, error: null }),
		});
		expect(result).toEqual({ status: 'error', message: 'Geen checkout-URL ontvangen.' });
	});

	it('returns checkout fallback when invoke fails without custom message', async () => {
		const result = await runDirectDebitStartFlow(new URLSearchParams('agreement=agr-1'), {
			...baseDeps,
			invokeCreateSubscriptionCheckout: async () => ({ data: null, error: new Error('failed') }),
			getFunctionErrorMessage: async (_data, _error, fallback) => fallback,
		});
		expect(result).toEqual({ status: 'error', message: 'Kon incasso niet starten.' });
	});
});
