import { describe, expect, it } from 'bun:test';
import {
	buildCreatedUserProfilePatch,
	buildCreateUserRoleWarningResponse,
	buildCreateUserSuccessResponse,
	hasCreatedAuthUser,
	resolveMissingCreatedUserError,
	shouldAssignCreateUserRole,
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

describe('buildCreatedUserProfilePatch', () => {
	it('returns null when neither phone nor date of birth is set', () => {
		expect(buildCreatedUserProfilePatch({})).toBeNull();
	});

	it('includes phone and date of birth when present', () => {
		expect(buildCreatedUserProfilePatch({ phone_number: '0612345678', date_of_birth: '1990-05-05' })).toEqual({
			phone_number: '0612345678',
			date_of_birth: '1990-05-05',
		});
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
