import { describe, expect, it } from 'bun:test';
import {
	applyPublicSignupSubmitOutcome,
	buildSignupOverviewRows,
	executePublicSignupSubmit,
	getPublicSignupFormValidationError,
	needsManualSignupChoiceNext,
	resolveSelectedSignupGroup,
	resolveSignupChoiceStepLabel,
} from '../../../src/lib/signup/publicSignupHelpers';

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

describe('resolveSignupChoiceStepLabel', () => {
	it('uses group wording for group lessons and frequency wording otherwise', () => {
		expect(resolveSignupChoiceStepLabel(true)).toBe('Kies groep');
		expect(resolveSignupChoiceStepLabel(false)).toBe('Hoe vaak?');
		expect(resolveSignupChoiceStepLabel(undefined)).toBe('Hoe vaak?');
	});
});

describe('needsManualSignupChoiceNext', () => {
	it('is true only for individual lessons with an empty option catalog', () => {
		expect(needsManualSignupChoiceNext(false, 0)).toBe(true);
		expect(needsManualSignupChoiceNext(false, 2)).toBe(false);
		expect(needsManualSignupChoiceNext(true, 0)).toBe(false);
	});
});

describe('resolveSelectedSignupGroup', () => {
	const groups = [
		{ id: 'g1', name: 'Maandag' },
		{ id: 'g2', name: 'Dinsdag' },
	];

	it('returns null for waitlist, unset, or unknown ids', () => {
		expect(resolveSelectedSignupGroup(groups, null)).toBeNull();
		expect(resolveSelectedSignupGroup(groups, 'waitlist')).toBeNull();
		expect(resolveSelectedSignupGroup(groups, 'missing')).toBeNull();
	});

	it('returns the matching group when selected', () => {
		expect(resolveSelectedSignupGroup(groups, 'g2')).toEqual({ id: 'g2', name: 'Dinsdag' });
	});
});

describe('buildSignupOverviewRows', () => {
	it('includes lesson option and personal fields for individual signup', () => {
		expect(
			buildSignupOverviewRows({
				lessonTypeName: 'Gitaar',
				isGroupLesson: false,
				isWaitlist: false,
				group: null,
				option: { duration_minutes: 30, frequency: 'weekly', price_per_lesson: 25 },
				form: baseForm,
			}),
		).toEqual([
			{ label: 'Lessoort', value: 'Gitaar' },
			{ label: 'Lesoptie', value: '30 min · Wekelijks · €25.00 per les' },
			{ label: 'Naam', value: 'Anna Bakker' },
			{ label: 'E-mail', value: 'anna@example.com' },
			{ label: 'Telefoon', value: '0612345678' },
			{ label: 'Geboortedatum', value: '01-05-2010' },
			{ label: 'Opmerkingen', value: 'Voorkeur maandag' },
		]);
	});

	it('shows waitlist for group signup without selected group', () => {
		expect(
			buildSignupOverviewRows({
				lessonTypeName: 'Band',
				isGroupLesson: true,
				isWaitlist: true,
				group: null,
				option: null,
				form: { ...baseForm, phone_number: '', date_of_birth: '', notes: '' },
			}),
		).toEqual([
			{ label: 'Lessoort', value: 'Band' },
			{ label: 'Groep', value: 'Wachtlijst' },
			{ label: 'Naam', value: 'Anna Bakker' },
			{ label: 'E-mail', value: 'anna@example.com' },
		]);
	});
});

describe('getPublicSignupFormValidationError', () => {
	it('allows empty optional phones', () => {
		expect(getPublicSignupFormValidationError(baseForm)).toBeNull();
		expect(
			getPublicSignupFormValidationError({
				...baseForm,
				phone_number: '',
				parent_phone_number: '',
			}),
		).toBeNull();
	});

	it('rejects incomplete student or parent phone numbers', () => {
		expect(getPublicSignupFormValidationError({ ...baseForm, phone_number: '061234567' })).toBe(
			'Telefoonnummer moet 10 cijfers bevatten',
		);
		expect(getPublicSignupFormValidationError({ ...baseForm, parent_phone_number: '0612' })).toBe(
			'Ouder telefoonnummer moet 10 cijfers bevatten',
		);
	});
});

describe('executePublicSignupSubmit', () => {
	it('blocks invoke when phone validation fails', async () => {
		let invoked = false;
		const outcome = await executePublicSignupSubmit({
			selectedType: { id: 'lt-1', is_group_lesson: false },
			selectedGroupId: null,
			selectedOption: null,
			lessonTypeOptions: [],
			form: { ...baseForm, phone_number: '06' },
			invoke: async () => {
				invoked = true;
				return { data: { success: true }, error: null };
			},
			getInvokeErrorMessage: async () => 'invoke failed',
		});
		expect(outcome).toEqual({
			kind: 'response-error',
			message: 'Telefoonnummer moet 10 cijfers bevatten',
		});
		expect(invoked).toBe(false);
	});

	it('returns success when invoke succeeds', async () => {
		const outcome = await executePublicSignupSubmit({
			selectedType: { id: 'lt-1', is_group_lesson: false },
			selectedGroupId: null,
			selectedOption: null,
			lessonTypeOptions: [],
			form: baseForm,
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
			invoke: async () => ({ data: { error: 'duplicate email' }, error: null }),
			getInvokeErrorMessage: async () => 'invoke failed',
		});
		expect(outcome).toEqual({ kind: 'response-error', message: 'duplicate email' });
	});

	it('builds group lesson payload', async () => {
		const invokedBodies: unknown[] = [];
		await executePublicSignupSubmit({
			selectedType: { id: 'lt-1', is_group_lesson: true },
			selectedGroupId: 'group-1',
			selectedOption: null,
			lessonTypeOptions: [],
			form: baseForm,
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
			},
		]);
	});

	it('resolves lesson type option id for individual lessons', async () => {
		const invokedBodies: unknown[] = [];
		await executePublicSignupSubmit({
			selectedType: { id: 'lt-1', is_group_lesson: false },
			selectedGroupId: null,
			selectedOption: {
				duration_minutes: 45,
				frequency: 'weekly',
				price_per_lesson: 25,
			},
			lessonTypeOptions: [
				{
					id: 'opt-1',
					duration_minutes: 45,
					frequency: 'weekly',
					price_per_lesson: 25,
				},
			],
			form: baseForm,
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
