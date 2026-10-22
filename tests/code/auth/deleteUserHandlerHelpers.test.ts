import { describe, expect, it } from 'bun:test';
import {
	buildDeleteUserSuccessResponse,
	resolveDeleteUserAuthFailure,
	resolveDeleteUserRequestAuth,
	resolveMissingRequestingUser,
} from '../../../supabase/functions/delete-user/deleteUserHandlerHelpers';

describe('resolveDeleteUserAuthFailure', () => {
	it('returns unauthorized when user lookup fails', () => {
		expect(resolveDeleteUserAuthFailure({ message: 'invalid token' }, null)).toEqual({
			status: 401,
			error: 'Invalid or expired token',
		});
	});

	it('returns null when requesting user is present', () => {
		expect(resolveDeleteUserAuthFailure(null, { id: 'user-1' })).toBeNull();
	});
});

describe('buildDeleteUserSuccessResponse', () => {
	it('returns success message payload', () => {
		expect(buildDeleteUserSuccessResponse()).toEqual({ message: 'Account successfully deleted' });
	});
});

describe('resolveDeleteUserRequestAuth', () => {
	it('returns auth failure when token lookup fails', () => {
		expect(resolveDeleteUserRequestAuth({ message: 'invalid token' }, null)).toEqual({
			status: 401,
			error: 'Invalid or expired token',
		});
	});

	it('returns null when requesting user is present', () => {
		expect(resolveDeleteUserRequestAuth(null, { id: 'user-1' })).toBeNull();
	});
});

describe('resolveMissingRequestingUser', () => {
	it('returns unauthorized when requesting user is missing', () => {
		expect(resolveMissingRequestingUser(null)).toEqual({
			status: 401,
			error: 'Invalid or expired token',
		});
	});

	it('returns null when requesting user exists', () => {
		expect(resolveMissingRequestingUser({ id: 'user-1' })).toBeNull();
	});
});
