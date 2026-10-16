import { describe, expect, it } from 'bun:test';
import {
	buildCreateStudentPayload,
	buildStudentProfileUpdateFields,
	buildStudentRecordUpdateFields,
	resolveCreateStudentInvokeResult,
} from '../../../src/components/students/studentFormPersistenceHelpers';
import { emptyStudentForm } from '../../../src/components/students/studentFormTypes';

describe('buildCreateStudentPayload', () => {
	it('includes existing user id for existing-user mode', () => {
		expect(buildCreateStudentPayload(emptyStudentForm, 'existing-user', 'user-1')).toEqual({
			mode: 'existing-user',
			existing_user_id: 'user-1',
			email: '',
			first_name: undefined,
			last_name: undefined,
			phone_number: undefined,
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

	it('omits existing user id for new-user mode', () => {
		expect(buildCreateStudentPayload(emptyStudentForm, 'new-user', null)).toEqual({
			mode: 'new-user',
			existing_user_id: undefined,
			email: '',
			first_name: undefined,
			last_name: undefined,
			phone_number: undefined,
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
});

describe('buildStudentProfileUpdateFields', () => {
	it('maps empty strings to null on profile scope without address fields', () => {
		expect(buildStudentProfileUpdateFields({ ...emptyStudentForm, last_name: 'Bakker' }, 'profile')).toEqual({
			first_name: null,
			last_name: 'Bakker',
			phone_number: null,
		});
	});

	it('collapses names and trims phone on profile scope', () => {
		expect(
			buildStudentProfileUpdateFields(
				{
					...emptyStudentForm,
					first_name: '  Anna   Marie ',
					last_name: '  Bakker  ',
					phone_number: ' 0612345678 ',
					postal_code: '1234A',
				},
				'profile',
			),
		).toEqual({
			first_name: 'Anna Marie',
			last_name: 'Bakker',
			phone_number: '0612345678',
		});
	});

	it('returns only address fields on address scope', () => {
		expect(
			buildStudentProfileUpdateFields(
				{
					...emptyStudentForm,
					first_name: 'Anna',
					street_name: 'Hoofdstraat',
					house_number: '12',
					postal_code: '1234 AB',
					city: 'Amsterdam',
					country_code: 'NL',
				},
				'address',
			),
		).toEqual({
			street_name: 'Hoofdstraat',
			house_number: '12',
			postal_code: '1234AB',
			city: 'Amsterdam',
			country_code: 'NL',
		});
	});

	it('returns null on parent scope', () => {
		expect(buildStudentProfileUpdateFields(emptyStudentForm, 'parent')).toBeNull();
	});
});

describe('buildStudentRecordUpdateFields', () => {
	it('returns date of birth and debtor fields on profile scope', () => {
		expect(
			buildStudentRecordUpdateFields(
				{
					...emptyStudentForm,
					date_of_birth: '2010-02-14',
					parent_name: 'Ouder',
					debtor_info_same_as_student: false,
					debtor_name: 'Debiteur BV',
					debtor_address: 'Straat 1',
					debtor_postal_code: '1234AB',
					debtor_city: 'Amsterdam',
				},
				'profile',
			),
		).toEqual({
			date_of_birth: '2010-02-14',
			debtor_info_same_as_student: false,
			debtor_name: 'Debiteur BV',
			debtor_address: 'Straat 1',
			debtor_postal_code: '1234AB',
			debtor_city: 'Amsterdam',
		});
	});

	it('returns only parent fields on parent scope', () => {
		expect(
			buildStudentRecordUpdateFields(
				{
					...emptyStudentForm,
					parent_name: 'Ouder Anna',
					parent_email: 'ouder@example.com',
					parent_phone_number: '0612345678',
					date_of_birth: '2010-02-14',
				},
				'parent',
			),
		).toEqual({
			parent_name: 'Ouder Anna',
			parent_email: 'ouder@example.com',
			parent_phone_number: '0612345678',
		});
	});

	it('returns null on address scope', () => {
		expect(buildStudentRecordUpdateFields(emptyStudentForm, 'address')).toBeNull();
	});
});

describe('resolveCreateStudentInvokeResult', () => {
	it('returns invoke error payload', () => {
		expect(resolveCreateStudentInvokeResult({ error: 'duplicate' })).toEqual({
			ok: false,
			title: 'Fout bij aanmaken leerling',
			description: 'duplicate',
		});
	});

	it('returns success with user id', () => {
		expect(resolveCreateStudentInvokeResult({ user_id: 'user-1' })).toEqual({
			ok: true,
			userId: 'user-1',
		});
	});
});
