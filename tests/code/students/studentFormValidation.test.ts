import { describe, expect, it } from 'bun:test';
import { emptyStudentForm } from '../../../src/components/students/studentFormTypes';
import {
	getStudentAddressTabValidationError,
	getStudentParentTabValidationError,
	getStudentProfileTabValidationError,
	resolveStudentProfileSaveValidationError,
} from '../../../src/components/students/studentFormValidation';

describe('getStudentProfileTabValidationError', () => {
	it('validates personal email and phone fields', () => {
		const error = getStudentProfileTabValidationError({
			...emptyStudentForm,
			email: 'invalid-email',
			phone_number: '123',
		});
		expect(error).toBe('Ongeldig emailadres');
	});

	it('requires all debtor fields when debtor info differs from the student', () => {
		const error = getStudentProfileTabValidationError({
			...emptyStudentForm,
			email: 'student@example.com',
			debtor_info_same_as_student: false,
			debtor_name: 'Debiteur BV',
		});
		expect(error).toBe(
			'Alle debiteur NAW velden zijn verplicht als debiteurinformatie niet gelijk is aan leerlinginformatie',
		);
	});

	it('ignores invalid parent phone on the profile tab', () => {
		const error = getStudentProfileTabValidationError({
			...emptyStudentForm,
			email: 'student@example.com',
			parent_phone_number: '123',
		});
		expect(error).toBeNull();
	});

	it('returns null for a valid profile form', () => {
		const error = getStudentProfileTabValidationError({
			...emptyStudentForm,
			email: 'student@example.com',
			phone_number: '0612345678',
			debtor_info_same_as_student: false,
			debtor_name: 'Debiteur BV',
			debtor_address: 'Straat 1',
			debtor_postal_code: '1234AB',
			debtor_city: 'Amsterdam',
		});
		expect(error).toBeNull();
	});
});

describe('getStudentParentTabValidationError', () => {
	it('validates parent phone only', () => {
		expect(
			getStudentParentTabValidationError({
				...emptyStudentForm,
				parent_phone_number: '123',
			}),
		).toBe('Ouder telefoonnummer moet 10 cijfers bevatten');
	});

	it('ignores incomplete debtor fields on the parent tab', () => {
		expect(
			getStudentParentTabValidationError({
				...emptyStudentForm,
				debtor_info_same_as_student: false,
				debtor_name: 'Debiteur BV',
			}),
		).toBeNull();
	});
});

describe('getStudentAddressTabValidationError', () => {
	it('rejects an invalid country code', () => {
		expect(
			getStudentAddressTabValidationError({
				...emptyStudentForm,
				country_code: 'N',
			}),
		).toBe('Landcode moet uit 2 letters bestaan (ISO 3166-1 alpha-2)');
	});

	it('allows a complete optional address', () => {
		expect(
			getStudentAddressTabValidationError({
				...emptyStudentForm,
				street_name: 'Hoofdstraat',
				house_number: '12',
				country_code: 'NL',
			}),
		).toBeNull();
	});
});

describe('resolveStudentProfileSaveValidationError', () => {
	it('blocks profile save when date of birth draft is not synced', () => {
		expect(
			resolveStudentProfileSaveValidationError({
				form: { ...emptyStudentForm, email: 'student@example.com' },
				scope: 'profile',
				dateOfBirthDraftSynced: false,
			}),
		).toBe('Geboortedatum is ongeldig');
	});

	it('ignores incomplete debtor fields on parent scope', () => {
		expect(
			resolveStudentProfileSaveValidationError({
				form: {
					...emptyStudentForm,
					debtor_info_same_as_student: false,
					debtor_name: 'Debiteur BV',
				},
				scope: 'parent',
			}),
		).toBeNull();
	});

	it('validates country code on address scope', () => {
		expect(
			resolveStudentProfileSaveValidationError({
				form: { ...emptyStudentForm, country_code: '123' },
				scope: 'address',
			}),
		).toBe('Landcode moet uit 2 letters bestaan (ISO 3166-1 alpha-2)');
	});
});
