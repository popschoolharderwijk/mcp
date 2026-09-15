import { describe, expect, it } from 'bun:test';
import {
	buildStudentAuthCreatePayload,
	buildStudentRowFields,
	type CreateStudentMode,
	resolveExistingStudentUserId,
	validateCreateStudentBody,
} from '../../../supabase/functions/create-student/createStudentPure';

const baseBody = {
	mode: 'new-user' as const,
	email: 'student@example.com',
	first_name: 'Anna',
	last_name: 'Bakker',
	debtor_info_same_as_student: true,
};

describe('validateCreateStudentBody', () => {
	it('accepts a valid new-user payload', () => {
		expect(validateCreateStudentBody(baseBody)).toBeNull();
	});

	it('accepts a valid existing-user payload', () => {
		expect(
			validateCreateStudentBody({
				...baseBody,
				mode: 'existing-user',
				existing_user_id: '33333333-3333-3333-3333-333333333333',
			}),
		).toBeNull();
	});

	it('requires a selected user for existing-user mode', () => {
		expect(
			validateCreateStudentBody({
				...baseBody,
				mode: 'existing-user',
			}),
		).toBe('Selecteer een gebruiker');
	});

	it('rejects invalid existing user ids', () => {
		expect(
			validateCreateStudentBody({
				...baseBody,
				mode: 'existing-user',
				existing_user_id: 'not-a-uuid',
			}),
		).toBe('Ongeldige gebruiker');
	});

	it('requires an email address', () => {
		expect(validateCreateStudentBody({ ...baseBody, email: '' })).toBe('Email is verplicht');
	});

	it('rejects an invalid email address', () => {
		expect(validateCreateStudentBody({ ...baseBody, email: 'not-an-email' })).toBe('Ongeldig e-mailadres');
	});

	it('rejects an invalid mode', () => {
		expect(validateCreateStudentBody({ ...baseBody, mode: 'other' as CreateStudentMode })).toBe('Ongeldige modus');
	});
});

describe('buildStudentRowFields', () => {
	it('clears debtor fields when debtor info matches the student', () => {
		expect(
			buildStudentRowFields({
				...baseBody,
				debtor_name: 'Other',
				debtor_address: 'Street 1',
				debtor_postal_code: '1234AB',
				debtor_city: 'Utrecht',
			}),
		).toEqual({
			date_of_birth: null,
			parent_name: null,
			parent_email: null,
			parent_phone_number: null,
			debtor_info_same_as_student: true,
			debtor_name: null,
			debtor_address: null,
			debtor_postal_code: null,
			debtor_city: null,
		});
	});

	it('keeps debtor fields when they differ from the student', () => {
		expect(
			buildStudentRowFields({
				...baseBody,
				debtor_info_same_as_student: false,
				debtor_name: 'Other',
				debtor_address: 'Street 1',
				debtor_postal_code: '1234AB',
				debtor_city: 'Utrecht',
			}),
		).toEqual({
			date_of_birth: null,
			parent_name: null,
			parent_email: null,
			parent_phone_number: null,
			debtor_info_same_as_student: false,
			debtor_name: 'Other',
			debtor_address: 'Street 1',
			debtor_postal_code: '1234AB',
			debtor_city: 'Utrecht',
		});
	});
});

describe('resolveExistingStudentUserId', () => {
	it('returns the selected user id in existing-user mode', () => {
		expect(
			resolveExistingStudentUserId({
				...baseBody,
				mode: 'existing-user',
				existing_user_id: '33333333-3333-3333-3333-333333333333',
			}),
		).toBe('33333333-3333-3333-3333-333333333333');
	});

	it('returns null for new-user mode', () => {
		expect(resolveExistingStudentUserId(baseBody)).toBeNull();
	});
});

describe('buildStudentAuthCreatePayload', () => {
	it('marks the email confirmed and includes metadata', () => {
		expect(buildStudentAuthCreatePayload(baseBody)).toEqual({
			email: 'student@example.com',
			email_confirm: true,
			user_metadata: {
				first_name: 'Anna',
				last_name: 'Bakker',
			},
		});
	});
});
