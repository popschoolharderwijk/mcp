import { describe, expect, it } from 'bun:test';
import {
	buildSignupAuthCreatePayload,
	buildSignupStudentPayload,
	buildSignupStudentUpdateFields,
	resolveExistingSignupStudentUserId,
	resolveSignupStudentRowMutation,
	shouldUpdateSignupPhoneOnCreate,
} from '../../../supabase/functions/approve-signup-request/ensureStudentFromSignupHelpers';

const reqRow = {
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

describe('buildSignupAuthCreatePayload', () => {
	it('builds auth admin create payload', () => {
		expect(buildSignupAuthCreatePayload(reqRow)).toEqual({
			email: 'jan@test.nl',
			email_confirm: true,
			user_metadata: { first_name: 'Jan', last_name: 'Leerling' },
		});
	});
});

describe('buildSignupStudentPayload', () => {
	it('builds student row payload', () => {
		expect(buildSignupStudentPayload('user-1', reqRow).user_id).toBe('user-1');
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
		expect(buildSignupStudentUpdateFields(reqRow)).toEqual({
			date_of_birth: '2010-01-01',
			parent_name: 'Ouder',
			parent_email: 'ouder@test.nl',
			parent_phone_number: '0687654321',
		});
	});
});
