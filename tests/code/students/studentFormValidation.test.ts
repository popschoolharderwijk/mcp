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

	it('returns null for valid parent scope', () => {
		expect(
			resolveStudentProfileSaveValidationError({
				form: emptyStudentForm,
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
