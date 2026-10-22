import { describe, expect, it } from 'bun:test';
import {
	buildCustomerPortalPostSuccess,
	resolveCustomerPortalPostGate,
} from '../../../supabase/functions/create-customer-portal/beginCustomerPortalHelpers';

describe('resolveCustomerPortalPostGate', () => {
	it('returns preflight responses first', () => {
		const preflight = new Response(null, { status: 204 });
		expect(resolveCustomerPortalPostGate(preflight, null, 'Bearer token')).toEqual({
			ok: false,
			response: preflight,
		});
	});

	it('returns auth header errors before success', () => {
		const authError = new Response('Unauthorized', { status: 401 });
		expect(resolveCustomerPortalPostGate(null, null, authError)).toEqual({
			ok: false,
			response: authError,
		});
	});

	it('returns the auth header when all gates pass', () => {
		expect(resolveCustomerPortalPostGate(null, null, 'Bearer token')).toEqual({
			ok: true,
			authHeader: 'Bearer token',
		});
	});
});

describe('buildCustomerPortalPostSuccess', () => {
	it('builds the success payload with origin fallback', () => {
		expect(
			buildCustomerPortalPostSuccess('Bearer token', { user_id: '11111111-1111-1111-1111-111111111111' }, null),
		).toEqual({
			ok: true,
			authHeader: 'Bearer token',
			body: { user_id: '11111111-1111-1111-1111-111111111111' },
			origin: '',
		});
	});
});
