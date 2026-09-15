import { describe, expect, it } from 'bun:test';
import { resolveCheckoutInitiatorAuthorization } from '../../../supabase/functions/create-subscription-checkout/checkoutAuthHandlerPure';

describe('resolveCheckoutInitiatorAuthorization', () => {
	const studentUserId = '11111111-1111-1111-1111-111111111111';
	const otherUserId = '22222222-2222-2222-2222-222222222222';

	it('returns 500 when privilege lookup fails', () => {
		expect(
			resolveCheckoutInitiatorAuthorization({ message: 'rpc failed' }, otherUserId, studentUserId, false),
		).toEqual({
			status: 500,
			error: 'Kon rechten niet controleren',
		});
	});

	it('returns 403 for unrelated authenticated users', () => {
		expect(resolveCheckoutInitiatorAuthorization(null, otherUserId, studentUserId, false)).toEqual({
			status: 403,
			error: 'Geen rechten om incasso te starten voor deze overeenkomst.',
		});
	});

	it('returns 403 when privilege lookup returns null for an unrelated user', () => {
		expect(resolveCheckoutInitiatorAuthorization(null, otherUserId, studentUserId, null)).toEqual({
			status: 403,
			error: 'Geen rechten om incasso te starten voor deze overeenkomst.',
		});
	});

	it('returns null for the agreement student', () => {
		expect(resolveCheckoutInitiatorAuthorization(null, studentUserId, studentUserId, false)).toBeNull();
	});

	it('returns null for privileged staff', () => {
		expect(resolveCheckoutInitiatorAuthorization(null, otherUserId, studentUserId, true)).toBeNull();
	});
});
