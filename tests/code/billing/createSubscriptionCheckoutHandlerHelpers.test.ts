import { describe, expect, it } from 'bun:test';
import { resolveCheckoutFlowMode } from '../../../supabase/functions/create-subscription-checkout/createSubscriptionCheckoutHandlerHelpers';

describe('resolveCheckoutFlowMode', () => {
	it('routes complete mode to complete handler', async () => {
		let called = 'none';
		await resolveCheckoutFlowMode('complete', {
			complete: async () => {
				called = 'complete';
				return new Response('complete');
			},
			direct: async () => new Response('direct'),
			checkout: async () => new Response('checkout'),
		});
		expect(called).toBe('complete');
	});

	it('routes direct mode to direct handler', async () => {
		let called = 'none';
		await resolveCheckoutFlowMode('direct', {
			complete: async () => new Response('complete'),
			direct: async () => {
				called = 'direct';
				return new Response('direct');
			},
			checkout: async () => new Response('checkout'),
		});
		expect(called).toBe('direct');
	});

	it('routes checkout mode to checkout handler', async () => {
		let called = 'none';
		await resolveCheckoutFlowMode('checkout', {
			complete: async () => new Response('complete'),
			direct: async () => new Response('direct'),
			checkout: async () => {
				called = 'checkout';
				return new Response('checkout');
			},
		});
		expect(called).toBe('checkout');
	});
});
