import { describe, expect, it } from 'bun:test';
import {
	buildStudentAuthCreatePayload,
	resolveExistingStudentUserId,
	resolveStudentRowMutation,
	shouldUpdateStudentPhoneOnCreate,
} from '../../../supabase/functions/schedule-trial-lesson/ensureStudentUserHelpers';

describe('resolveExistingStudentUserId', () => {
	it('returns existing user id when profile exists', () => {
		expect(resolveExistingStudentUserId({ user_id: 'user-1' })).toBe('user-1');
	});

	it('returns null when profile is missing', () => {
		expect(resolveExistingStudentUserId(null)).toBeNull();
	});
});

describe('shouldUpdateStudentPhoneOnCreate', () => {
	it('returns true when phone number is present', () => {
		expect(shouldUpdateStudentPhoneOnCreate('0612345678')).toBe(true);
	});

	it('returns false when phone number is missing', () => {
		expect(shouldUpdateStudentPhoneOnCreate(null)).toBe(false);
	});
});

describe('resolveStudentRowMutation', () => {
	it('returns update when student row exists', () => {
		expect(resolveStudentRowMutation({ user_id: 'user-1' })).toBe('update');
	});

	it('returns insert when student row is missing', () => {
		expect(resolveStudentRowMutation(null)).toBe('insert');
	});
});

describe('buildStudentAuthCreatePayload', () => {
	it('builds auth admin create payload', () => {
		expect(
			buildStudentAuthCreatePayload({
				studentEmail: 'jan@test.nl',
				studentFirstName: 'Jan',
				studentLastName: 'Leerling',
			}),
		).toEqual({
			email: 'jan@test.nl',
			email_confirm: true,
			user_metadata: { first_name: 'Jan', last_name: 'Leerling' },
		});
	});
});
