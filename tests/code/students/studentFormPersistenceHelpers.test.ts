import { describe, expect, it } from 'bun:test';
import {
	buildCreateStudentPayload,
	buildStudentProfileUpdateFields,
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
	it('maps empty strings to null', () => {
		expect(buildStudentProfileUpdateFields({ ...emptyStudentForm, last_name: 'Bakker' })).toEqual({
			first_name: null,
			last_name: 'Bakker',
			phone_number: null,
		});
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
