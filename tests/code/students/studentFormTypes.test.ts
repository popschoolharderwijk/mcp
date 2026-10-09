import { describe, expect, it } from 'bun:test';
import {
	emptyStudentForm,
	isValidEmail,
	isValidPhone,
	studentFormFromStudent,
	studentRecordFields,
} from '../../../src/components/students/studentFormTypes';
import type { Student } from '../../../src/types/students';

const baseStudent: Student = {
	user_id: 'user-1',
	email: 'student@example.com',
	first_name: 'Anna',
	last_name: 'Leerling',
	avatar_url: null,
	phone_number: '0612345678',
	date_of_birth: '2010-05-01',
	parent_name: 'Ouder Anna',
	parent_email: 'ouder@example.com',
	parent_phone_number: '0687654321',
	debtor_info_same_as_student: false,
	debtor_name: 'Debiteur BV',
	debtor_address: 'Straat 1',
	debtor_postal_code: '1234AB',
	debtor_city: 'Amsterdam',
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
	created_by: null,
	updated_by: null,
};

describe('isValidEmail', () => {
	it('accepts a valid email address', () => {
		expect(isValidEmail('student@example.com')).toBe(true);
	});

	it('rejects an invalid email address', () => {
		expect(isValidEmail('not-an-email')).toBe(false);
	});
});

describe('isValidPhone', () => {
	it('accepts a 10-digit phone number', () => {
		expect(isValidPhone('0612345678')).toBe(true);
	});

	it('accepts a phone number with spaces', () => {
		expect(isValidPhone('06 12 34 56 78')).toBe(true);
	});

	it('rejects a phone number with fewer than 10 digits', () => {
		expect(isValidPhone('061234567')).toBe(false);
	});
});

describe('studentRecordFields', () => {
	it('maps empty strings to null and keeps debtor fields when debtor info differs', () => {
		const form = {
			...emptyStudentForm,
			parent_name: '',
			parent_email: '',
			parent_phone_number: '',
			debtor_info_same_as_student: false,
			debtor_name: 'Debiteur BV',
			debtor_address: 'Straat 1',
			debtor_postal_code: '1234AB',
			debtor_city: 'Amsterdam',
		};

		expect(studentRecordFields(form)).toEqual({
			date_of_birth: null,
			parent_name: null,
			parent_email: null,
			parent_phone_number: null,
			debtor_info_same_as_student: false,
			debtor_name: 'Debiteur BV',
			debtor_address: 'Straat 1',
			debtor_postal_code: '1234AB',
			debtor_city: 'Amsterdam',
		});
	});

	it('nulls debtor fields when debtor info matches the student', () => {
		const form = {
			...emptyStudentForm,
			debtor_info_same_as_student: true,
			debtor_name: 'Ignored',
			debtor_address: 'Ignored',
			debtor_postal_code: 'Ignored',
			debtor_city: 'Ignored',
		};

		expect(studentRecordFields(form)).toEqual({
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

	it('collapses parent and debtor name fields', () => {
		expect(
			studentRecordFields({
				...emptyStudentForm,
				parent_name: '  Ouder   Anna  ',
				parent_email: '  ouder@example.com  ',
				debtor_info_same_as_student: false,
				debtor_name: 'Debiteur   BV',
				debtor_address: 'Straat   1',
				debtor_postal_code: ' 1234AB ',
				debtor_city: 'Amsterdam   Centrum',
			}),
		).toEqual({
			date_of_birth: null,
			parent_name: 'Ouder Anna',
			parent_email: 'ouder@example.com',
			parent_phone_number: null,
			debtor_info_same_as_student: false,
			debtor_name: 'Debiteur BV',
			debtor_address: 'Straat 1',
			debtor_postal_code: '1234AB',
			debtor_city: 'Amsterdam Centrum',
		});
	});
});

describe('studentFormFromStudent', () => {
	it('maps nullable student fields to form defaults', () => {
		expect(studentFormFromStudent(baseStudent)).toEqual({
			email: 'student@example.com',
			first_name: 'Anna',
			last_name: 'Leerling',
			phone_number: '0612345678',
			date_of_birth: '2010-05-01',
			parent_name: 'Ouder Anna',
			parent_email: 'ouder@example.com',
			parent_phone_number: '0687654321',
			debtor_info_same_as_student: false,
			debtor_name: 'Debiteur BV',
			debtor_address: 'Straat 1',
			debtor_postal_code: '1234AB',
			debtor_city: 'Amsterdam',
			street_name: '',
			house_number: '',
			postal_code: '',
			city: '',
			country_code: 'NL',
		});
	});

	it('uses empty strings for missing contact fields', () => {
		const student = {
			...baseStudent,
			email: null,
			first_name: null,
			last_name: null,
			phone_number: null,
			parent_name: null,
			parent_email: null,
			parent_phone_number: null,
			debtor_name: null,
			debtor_address: null,
			debtor_postal_code: null,
			debtor_city: null,
		} as unknown as Student;

		expect(studentFormFromStudent(student)).toEqual({
			email: '',
			first_name: '',
			last_name: '',
			phone_number: '',
			date_of_birth: '2010-05-01',
			parent_name: '',
			parent_email: '',
			parent_phone_number: '',
			debtor_info_same_as_student: false,
			debtor_name: '',
			debtor_address: '',
			debtor_postal_code: '',
			debtor_city: '',
			street_name: '',
			house_number: '',
			postal_code: '',
			city: '',
			country_code: 'NL',
		});
	});

	it('maps profile address fields onto the form', () => {
		expect(
			studentFormFromStudent({
				...baseStudent,
				street_name: 'Hoofdstraat',
				house_number: '12A',
				postal_code: '1234AB',
				city: 'Amsterdam',
				country_code: 'nl',
			}),
		).toEqual({
			...studentFormFromStudent(baseStudent),
			street_name: 'Hoofdstraat',
			house_number: '12A',
			postal_code: '1234AB',
			city: 'Amsterdam',
			country_code: 'NL',
		});
	});
});
