import { describe, expect, it } from 'bun:test';
import { resolveCustomerPortalTargetUserId } from '../../../supabase/functions/create-customer-portal/validation';
import {
	buildCustomerPortalSuccessPayload,
	canOpenPortalForOtherUser,
	parseCustomerPortalBody,
	parseCustomerPortalRequestBody,
	resolveMissingStripeCustomerResponse,
	resolvePortalForOtherUserForbiddenResponse,
	resolvePortalReturnUrl,
	validateCustomerPortalUserId,
} from '../../../supabase/functions/create-customer-portal/validationPure';

const USER_ID = '11111111-1111-1111-1111-111111111111';

async function readError(response: Response): Promise<string> {
	const body = (await response.json()) as { error: string };
	return body.error;
}

function createRoleSupabaseMock(role: string | null, roleError: { message: string } | null = null) {
	return {
		from: () => ({
			select: () => ({
				eq: () => ({
					single: () =>
						Promise.resolve({
							data: role === null ? null : { role },
							error: roleError,
						}),
				}),
			}),
		}),
	} as unknown as Parameters<typeof resolveCustomerPortalTargetUserId>[0];
}

describe('resolveCustomerPortalTargetUserId', () => {
	it('returns the requesting user when no other user is requested', async () => {
		const result = await resolveCustomerPortalTargetUserId(createRoleSupabaseMock('student'), USER_ID, undefined);
		expect(result).toEqual({ targetUserId: USER_ID, error: null });
	});

	it('returns the requesting user when they request their own portal', async () => {
		const result = await resolveCustomerPortalTargetUserId(createRoleSupabaseMock('student'), USER_ID, USER_ID);
		expect(result).toEqual({ targetUserId: USER_ID, error: null });
	});

	it('returns 403 when role lookup fails', async () => {
		const result = await resolveCustomerPortalTargetUserId(
			createRoleSupabaseMock(null, { message: 'db error' }),
			USER_ID,
			'22222222-2222-2222-2222-222222222222',
		);
		expect(result.targetUserId).toBe(USER_ID);
		expect(result.error?.status).toBe(403);
		expect(await readError(result.error as Response)).toBe(
			'Geen rechten om portal voor andere gebruiker te openen',
		);
	});

	it('returns 403 when the requesting user is not staff', async () => {
		const result = await resolveCustomerPortalTargetUserId(
			createRoleSupabaseMock('student'),
			USER_ID,
			'22222222-2222-2222-2222-222222222222',
		);
		expect(result.error?.status).toBe(403);
	});

	it('returns the requested user for staff roles', async () => {
		const otherUserId = '22222222-2222-2222-2222-222222222222';
		const staffResult = await resolveCustomerPortalTargetUserId(
			createRoleSupabaseMock('staff'),
			USER_ID,
			otherUserId,
		);
		expect(staffResult).toEqual({ targetUserId: otherUserId, error: null });

		const adminResult = await resolveCustomerPortalTargetUserId(
			createRoleSupabaseMock('admin'),
			USER_ID,
			otherUserId,
		);
		expect(adminResult).toEqual({ targetUserId: otherUserId, error: null });

		const siteAdminResult = await resolveCustomerPortalTargetUserId(
			createRoleSupabaseMock('site_admin'),
			USER_ID,
			otherUserId,
		);
		expect(siteAdminResult).toEqual({ targetUserId: otherUserId, error: null });
	});
});

describe('parseCustomerPortalBody', () => {
	it('returns an empty object for non-object input', () => {
		expect(parseCustomerPortalBody(null)).toEqual({});
		expect(parseCustomerPortalBody('bad')).toEqual({});
	});

	it('returns the raw object for valid input', () => {
		expect(parseCustomerPortalBody({ user_id: USER_ID, return_url: 'https://example.com' })).toEqual({
			user_id: USER_ID,
			return_url: 'https://example.com',
		});
	});
});

describe('canOpenPortalForOtherUser', () => {
	it('returns true for staff, admin and site_admin roles', () => {
		expect(canOpenPortalForOtherUser('staff')).toBe(true);
		expect(canOpenPortalForOtherUser('admin')).toBe(true);
		expect(canOpenPortalForOtherUser('site_admin')).toBe(true);
	});

	it('returns false for student and missing roles', () => {
		expect(canOpenPortalForOtherUser('student')).toBe(false);
		expect(canOpenPortalForOtherUser(null)).toBe(false);
	});
});

describe('resolvePortalForOtherUserForbiddenResponse', () => {
	it('returns a 403 response with Dutch error text', async () => {
		const response = resolvePortalForOtherUserForbiddenResponse();
		expect(response.status).toBe(403);
		expect(await readError(response)).toBe('Geen rechten om portal voor andere gebruiker te openen');
	});
});

describe('resolveMissingStripeCustomerResponse', () => {
	it('returns a 404 response with Dutch error text', async () => {
		const response = resolveMissingStripeCustomerResponse();
		expect(response.status).toBe(404);
		expect(await readError(response)).toBe('Geen Stripe klant gekoppeld');
	});
});

describe('resolvePortalReturnUrl', () => {
	it('uses the provided return url when present', () => {
		expect(resolvePortalReturnUrl('https://app.example.com', 'https://example.com/back')).toBe(
			'https://example.com/back',
		);
	});

	it('falls back to the profile route on the origin', () => {
		expect(resolvePortalReturnUrl('https://app.example.com', undefined)).toBe(
			'https://app.example.com/account/profile',
		);
	});
});

describe('buildCustomerPortalSuccessPayload', () => {
	it('wraps the portal url', () => {
		expect(buildCustomerPortalSuccessPayload('https://billing.example/session')).toEqual({
			url: 'https://billing.example/session',
		});
	});
});

describe('parseCustomerPortalRequestBody', () => {
	it('returns parsed json bodies', async () => {
		const req = new Request('https://example.com', {
			method: 'POST',
			body: JSON.stringify({ user_id: USER_ID }),
		});
		expect(await parseCustomerPortalRequestBody(req)).toEqual({ user_id: USER_ID });
	});

	it('returns an empty object for invalid json', async () => {
		const req = new Request('https://example.com', { method: 'POST', body: '{' });
		expect(await parseCustomerPortalRequestBody(req)).toEqual({});
	});
});

describe('validateCustomerPortalUserId', () => {
	it('returns null when user id is omitted', () => {
		expect(validateCustomerPortalUserId(undefined)).toBeNull();
	});

	it('returns null for a valid uuid', () => {
		expect(validateCustomerPortalUserId(USER_ID)).toBeNull();
	});

	it('returns a 400 response for an invalid uuid', async () => {
		const response = validateCustomerPortalUserId('bad');
		expect(response?.status).toBe(400);
		expect(await readError(response as Response)).toBe('Ongeldig user_id');
	});
});
