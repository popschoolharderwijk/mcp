import { describe, expect, it } from 'bun:test';
import {
	applyPublicSignupSubmitOutcome,
	executePublicSignupSubmit,
	isStep2NextDisabled,
	validateSepaFields,
} from '../../../src/lib/signup/publicSignupHelpers';

const VALID_IBAN = 'NL91ABNA0417164300';

const baseForm = {
	first_name: 'Anna',
	last_name: 'Bakker',
	email: 'anna@example.com',
	phone_number: '0612345678',
	date_of_birth: '2010-05-01',
	parent_name: '',
	parent_email: '',
	parent_phone_number: '',
	notes: 'Voorkeur maandag',
};

describe('validateSepaFields', () => {
	it('returns null when SEPA is disabled', () => {
		expect(
			validateSepaFields({
				enabled: false,
				iban: '',
				holder: '',
				bic: '',
				consent: false,
			}),
		).toBeNull();
	});

	it('returns IBAN error for invalid IBAN', () => {
		expect(
			validateSepaFields({
				enabled: true,
				iban: 'INVALID',
				holder: 'Anna Bakker',
				bic: '',
				consent: true,
			}),
		).toBe('Ongeldig IBAN');
	});

	it('returns holder error when holder is blank', () => {
		expect(
			validateSepaFields({
				enabled: true,
				iban: VALID_IBAN,
				holder: '   ',
				bic: '',
				consent: true,
			}),
		).toBe('Vul de rekeninghouder in');
	});

	it('returns consent error when consent is missing', () => {
		expect(
			validateSepaFields({
				enabled: true,
				iban: VALID_IBAN,
				holder: 'Anna Bakker',
				bic: '',
				consent: false,
			}),
		).toBe('Bevestig de SEPA-machtiging om door te gaan');
	});

	it('returns null for valid SEPA fields', () => {
		expect(
			validateSepaFields({
				enabled: true,
				iban: VALID_IBAN,
				holder: 'Anna Bakker',
				bic: 'ABNANL2A',
				consent: true,
			}),
		).toBeNull();
	});
});

describe('isStep2NextDisabled', () => {
	it('requires group selection for group lessons', () => {
		expect(isStep2NextDisabled(true, null, 0, false)).toBe(true);
		expect(isStep2NextDisabled(true, 'group-1', 0, false)).toBe(false);
	});

	it('requires option selection when options exist for individual lessons', () => {
		expect(isStep2NextDisabled(false, null, 2, false)).toBe(true);
		expect(isStep2NextDisabled(false, null, 2, true)).toBe(false);
	});

	it('allows next when no options exist for individual lessons', () => {
		expect(isStep2NextDisabled(false, null, 0, false)).toBe(false);
	});
});

describe('executePublicSignupSubmit', () => {
	it('returns success when invoke succeeds', async () => {
		const outcome = await executePublicSignupSubmit({
			selectedType: { id: 'lt-1', is_group_lesson: false },
			selectedGroupId: null,
			selectedOption: null,
			lessonTypeOptions: [],
			form: baseForm,
			sepa: { enabled: false, iban: '', holder: '', bic: '', consent: false },
			invoke: async () => ({ data: { success: true }, error: null }),
			getInvokeErrorMessage: async () => 'invoke failed',
		});
		expect(outcome).toEqual({ kind: 'success' });
	});

	it('returns invoke-error when invoke fails', async () => {
		const outcome = await executePublicSignupSubmit({
			selectedType: { id: 'lt-1', is_group_lesson: false },
			selectedGroupId: null,
			selectedOption: null,
			lessonTypeOptions: [],
			form: baseForm,
			sepa: { enabled: false, iban: '', holder: '', bic: '', consent: false },
			invoke: async () => ({ data: null, error: { message: 'network' } }),
			getInvokeErrorMessage: async () => 'network error',
		});
		expect(outcome).toEqual({ kind: 'invoke-error', message: 'network error' });
	});

	it('returns response-error when response contains error', async () => {
		const outcome = await executePublicSignupSubmit({
			selectedType: { id: 'lt-1', is_group_lesson: false },
			selectedGroupId: null,
			selectedOption: null,
			lessonTypeOptions: [],
			form: baseForm,
			sepa: { enabled: false, iban: '', holder: '', bic: '', consent: false },
			invoke: async () => ({ data: { error: 'duplicate email' }, error: null }),
			getInvokeErrorMessage: async () => 'invoke failed',
		});
		expect(outcome).toEqual({ kind: 'response-error', message: 'duplicate email' });
	});

	it('builds group lesson payload with normalized SEPA fields', async () => {
		const invokedBodies: unknown[] = [];
		await executePublicSignupSubmit({
			selectedType: { id: 'lt-1', is_group_lesson: true },
			selectedGroupId: 'group-1',
			selectedOption: null,
			lessonTypeOptions: [],
			form: baseForm,
			sepa: {
				enabled: true,
				iban: 'nl91 abna 0417 1643 00',
				holder: ' Anna Bakker ',
				bic: ' abnanl2a ',
				consent: true,
			},
			invoke: async (body) => {
				invokedBodies.push(body);
				return { data: { success: true }, error: null };
			},
			getInvokeErrorMessage: async () => 'invoke failed',
		});
		expect(invokedBodies).toEqual([
			{
				lesson_type_id: 'lt-1',
				lesson_group_id: 'group-1',
				lesson_type_option_id: null,
				...baseForm,
				sepa_iban: 'NL91ABNA0417164300',
				sepa_account_holder: 'Anna Bakker',
				sepa_bic: 'ABNANL2A',
			},
		]);
	});

	it('resolves lesson type option id for individual lessons', async () => {
		const invokedBodies: unknown[] = [];
		await executePublicSignupSubmit({
			selectedType: { id: 'lt-1', is_group_lesson: false },
			selectedGroupId: null,
			selectedOption: { id: 'opt-1', 
				duration_minutes: 45,
				frequency: 'weekly',
			},
			lessonTypeOptions: [
				{
					id: 'opt-1',
					duration_minutes: 45,
					frequency: 'weekly',
				},
			],
			form: baseForm,
			sepa: { enabled: false, iban: '', holder: '', bic: '', consent: false },
			invoke: async (body) => {
				invokedBodies.push(body);
				return { data: { success: true }, error: null };
			},
			getInvokeErrorMessage: async () => 'invoke failed',
		});
		expect(invokedBodies).toEqual([
			{
				lesson_type_id: 'lt-1',
				lesson_group_id: null,
				lesson_type_option_id: 'opt-1',
				...baseForm,
				sepa_iban: null,
				sepa_account_holder: null,
				sepa_bic: null,
			},
		]);
	});
});

describe('applyPublicSignupSubmitOutcome', () => {
	it('sets invoke error message', () => {
		let error = null as string | null;
		let succeeded = false;
		applyPublicSignupSubmitOutcome(
			{ kind: 'invoke-error', message: 'network' },
			(value: string | null) => {
				error = value;
			},
			() => {
				succeeded = true;
			},
		);
		expect(error).toBe('network');
		expect(succeeded).toBe(false);
	});

	it('calls onSuccess for success outcome', () => {
		let succeeded = false;
		applyPublicSignupSubmitOutcome(
			{ kind: 'success' },
			() => {},
			() => {
				succeeded = true;
			},
		);
		expect(succeeded).toBe(true);
	});
});
