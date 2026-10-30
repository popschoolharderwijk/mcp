import { describe, expect, it } from 'bun:test';
import {
	buildStudentAuthCreatePayload,
	buildStudentProfileFields,
	buildStudentRowFields,
	type CreateStudentMode,
	resolveExistingStudentUserId,
	validateCreateStudentBody,
} from '../../../supabase/functions/create-student/createStudentHelpers';

const baseBody = {
	mode: 'new-user' as const,
	email: 'student@example.com',
	first_name: 'Anna',
	last_name: 'Bakker',
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
	it('maps parent contact fields and nulls empty values', () => {
		expect(buildStudentRowFields(baseBody)).toEqual({
			date_of_birth: null,
			parent_name: null,
			parent_email: null,
			parent_phone_number: null,
		});
	});

	it('collapses parent text fields', () => {
		expect(
			buildStudentRowFields({
				...baseBody,
				parent_name: '  Ouder   Anna ',
				parent_email: '  ouder@example.com  ',
			}),
		).toEqual({
			date_of_birth: null,
			parent_name: 'Ouder Anna',
			parent_email: 'ouder@example.com',
			parent_phone_number: null,
		});
	});
});

describe('buildStudentProfileFields', () => {
	it('collapses names and trims phone', () => {
		expect(
			buildStudentProfileFields({
				...baseBody,
				first_name: '  Anna   Marie ',
				last_name: '  Bakker  ',
				phone_number: ' 0612345678 ',
			}),
		).toEqual({
			first_name: 'Anna Marie',
			last_name: 'Bakker',
			phone_number: '0612345678',
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
