import { describe, expect, it } from 'bun:test';
import { canInitiateSubscriptionCheckout } from '../../../supabase/functions/create-subscription-checkout/checkoutAuthorizationPure';

describe('canInitiateSubscriptionCheckout', () => {
	const studentUserId = '11111111-1111-1111-1111-111111111111';
	const otherUserId = '22222222-2222-2222-2222-222222222222';

	it('allows the agreement student', () => {
		expect(canInitiateSubscriptionCheckout(studentUserId, studentUserId, false)).toBe(true);
	});

	it('allows privileged staff', () => {
		expect(canInitiateSubscriptionCheckout(otherUserId, studentUserId, true)).toBe(true);
	});

	it('denies unrelated authenticated users such as teachers', () => {
		expect(canInitiateSubscriptionCheckout(otherUserId, studentUserId, false)).toBe(false);
	});
});
