import { describe, expect, it } from 'bun:test';
import {
	buildCreateUserRoleWarningResponse,
	buildCreateUserSuccessResponse,
	hasCreatedAuthUser,
	resolveMissingCreatedUserError,
	shouldAssignCreateUserRole,
	shouldUpdateCreatedUserPhone,
} from '../../../supabase/functions/_shared/createUserHandlersHelpers';

describe('buildCreateUserSuccessResponse', () => {
	it('builds the success payload', () => {
		expect(buildCreateUserSuccessResponse('user-1', 'user@example.com')).toEqual({
			message: 'Gebruiker succesvol aangemaakt',
			user_id: 'user-1',
			email: 'user@example.com',
		});
	});
});

describe('buildCreateUserRoleWarningResponse', () => {
	it('builds the role warning payload', () => {
		expect(buildCreateUserRoleWarningResponse('user-1', 'insert failed')).toEqual({
			message: 'Gebruiker aangemaakt, maar rol kon niet worden toegewezen.',
			user_id: 'user-1',
			warning: 'insert failed',
		});
	});
});

describe('shouldUpdateCreatedUserPhone', () => {
	it('returns true only when a phone number is present', () => {
		expect(shouldUpdateCreatedUserPhone('0612345678')).toBe(true);
		expect(shouldUpdateCreatedUserPhone(undefined)).toBe(false);
	});
});

describe('shouldAssignCreateUserRole', () => {
	it('returns true only when a role is present', () => {
		expect(shouldAssignCreateUserRole('staff')).toBe(true);
		expect(shouldAssignCreateUserRole(undefined)).toBe(false);
	});
});

describe('resolveMissingCreatedUserError', () => {
	it('returns the Dutch missing user message', () => {
		expect(resolveMissingCreatedUserError()).toBe('Gebruiker kon niet worden aangemaakt');
	});
});

describe('hasCreatedAuthUser', () => {
	it('returns true when a user id is present', () => {
		expect(hasCreatedAuthUser({ id: 'user-1', email: 'user@example.com' })).toBe(true);
	});

	it('returns false when user is missing', () => {
		expect(hasCreatedAuthUser(null)).toBe(false);
	});
});
