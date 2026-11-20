import { describe, expect, it } from 'bun:test';
import {
	buildChildMemberProfileInsert,
	buildMemberMembershipInsert,
	buildSignupAuthCreatePayload,
	buildSignupStudentPayload,
	buildSignupStudentUpdateFields,
	isParentOwnedSignup,
	resolveAuthCreateUserId,
	resolveExistingSignupStudentUserId,
	resolveSignupLoginEmail,
	resolveSignupStudentRowMutation,
	shouldApplySignupPhoneOnCreate,
	shouldUpdateSignupPhoneOnCreate,
} from '../../../supabase/functions/approve-signup-request/ensureStudentFromSignupHelpers';

const minorReqRow = {
	id: 'req-1',
	status: 'pending',
	email: 'jan@test.nl',
	first_name: 'Jan',
	last_name: 'Leerling',
	phone_number: '0612345678',
	date_of_birth: '2010-01-01',
	parent_name: 'Ouder',
	parent_email: 'ouder@test.nl',
	parent_phone_number: '0687654321',
	lesson_group_id: null,
};

const adultReqRow = {
	...minorReqRow,
	date_of_birth: '2000-01-01',
	parent_name: null,
	parent_email: null,
	parent_phone_number: null,
};

describe('resolveExistingSignupStudentUserId', () => {
	it('returns existing user id when profile exists', () => {
		expect(resolveExistingSignupStudentUserId({ user_id: 'user-1' })).toBe('user-1');
	});

	it('returns null when profile is missing', () => {
		expect(resolveExistingSignupStudentUserId(null)).toBeNull();
	});
});

describe('shouldUpdateSignupPhoneOnCreate', () => {
	it('returns true when phone number is present', () => {
		expect(shouldUpdateSignupPhoneOnCreate('0612345678')).toBe(true);
	});

	it('returns false when phone number is missing', () => {
		expect(shouldUpdateSignupPhoneOnCreate(null)).toBe(false);
	});
});

describe('shouldApplySignupPhoneOnCreate', () => {
	it('applies phone for adult signup with phone', () => {
		expect(shouldApplySignupPhoneOnCreate(adultReqRow)).toBe(true);
	});

	it('skips phone for parent-owned signup even when phone set', () => {
		expect(shouldApplySignupPhoneOnCreate(minorReqRow)).toBe(false);
	});

	it('skips phone for adult signup without phone', () => {
		expect(shouldApplySignupPhoneOnCreate({ ...adultReqRow, phone_number: null })).toBe(false);
	});
});

describe('resolveAuthCreateUserId', () => {
	it('returns user id when create succeeded', () => {
		expect(resolveAuthCreateUserId({ user: { id: 'u-1' } }, null)).toBe('u-1');
	});

	it('returns null when create error is set', () => {
		expect(resolveAuthCreateUserId({ user: { id: 'u-1' } }, { message: 'dup' })).toBeNull();
	});

	it('returns null when user is missing', () => {
		expect(resolveAuthCreateUserId({ user: null }, null)).toBeNull();
	});
});

describe('isParentOwnedSignup', () => {
	it('is true when parent_email is set', () => {
		expect(isParentOwnedSignup(minorReqRow)).toBe(true);
	});

	it('is false when parent_email is missing', () => {
		expect(isParentOwnedSignup(adultReqRow)).toBe(false);
	});
});

describe('resolveSignupLoginEmail', () => {
	it('uses parent_email for minors', () => {
		expect(resolveSignupLoginEmail(minorReqRow)).toBe('ouder@test.nl');
	});

	it('uses student email for adults', () => {
		expect(resolveSignupLoginEmail(adultReqRow)).toBe('jan@test.nl');
	});
});

describe('buildSignupAuthCreatePayload', () => {
	it('uses parent email and parent name for minors', () => {
		expect(buildSignupAuthCreatePayload(minorReqRow)).toEqual({
			email: 'ouder@test.nl',
			email_confirm: true,
			user_metadata: { first_name: 'Ouder', last_name: null },
		});
	});

	it('uses student email and name for adults', () => {
		expect(buildSignupAuthCreatePayload(adultReqRow)).toEqual({
			email: 'jan@test.nl',
			email_confirm: true,
			user_metadata: { first_name: 'Jan', last_name: 'Leerling' },
		});
	});
});

describe('buildSignupStudentPayload', () => {
	it('builds student row payload', () => {
		expect(buildSignupStudentPayload('user-1', minorReqRow).user_id).toBe('user-1');
	});
});

describe('resolveSignupStudentRowMutation', () => {
	it('returns update when student row exists', () => {
		expect(resolveSignupStudentRowMutation({ user_id: 'user-1' })).toBe('update');
	});

	it('returns insert when student row is missing', () => {
		expect(resolveSignupStudentRowMutation(null)).toBe('insert');
	});
});

describe('buildSignupStudentUpdateFields', () => {
	it('builds student update fields from signup request', () => {
		expect(buildSignupStudentUpdateFields(minorReqRow)).toEqual({
			date_of_birth: '2010-01-01',
			parent_name: 'Ouder',
			parent_email: 'ouder@test.nl',
			parent_phone_number: '0687654321',
		});
	});
});

describe('buildChildMemberProfileInsert', () => {
	it('creates a member profile with null email', () => {
		expect(
			buildChildMemberProfileInsert({
				profileId: 'child-1',
				firstName: 'Jan',
				lastName: 'Leerling',
				phoneNumber: '0612345678',
			}),
		).toEqual({
			user_id: 'child-1',
			email: null,
			first_name: 'Jan',
			last_name: 'Leerling',
			phone_number: '0612345678',
		});
	});
});

describe('buildMemberMembershipInsert', () => {
	it('links child profile as member under login', () => {
		expect(buildMemberMembershipInsert('login-1', 'child-1')).toEqual({
			login_user_id: 'login-1',
			profile_id: 'child-1',
			role: 'member',
		});
	});
});
