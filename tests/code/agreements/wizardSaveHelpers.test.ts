import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import type { NavigateFunction } from 'react-router-dom';
import type { SlotWithStatus } from '../../../src/lib/agreementSlots';
import type { WizardSaveForm } from '../../../src/lib/agreements/wizardSaveHelpers';
import type { AgreementTableRow } from '../../../src/types/lesson-agreements';

const toastMessages: { type: 'error' | 'success' | 'warning'; message: string }[] = [];

mock.module('sonner', () => ({
	toast: {
		error: (message: string) => {
			toastMessages.push({ type: 'error', message });
		},
		success: (message: string) => {
			toastMessages.push({ type: 'success', message });
		},
		warning: (message: string) => {
			toastMessages.push({ type: 'warning', message });
		},
	},
}));

type TableResult = { data?: unknown; error?: { message: string } | null };

const recordedCalls: { table: string; op: 'insert' | 'update'; payload: unknown; filters: Record<string, unknown> }[] =
	[];
let tableResults: Record<string, TableResult> = {};

function thenableResult(result: TableResult) {
	const promise = Promise.resolve(result);
	return Object.assign(promise, {
		eq: () => thenableResult(result),
		select: () => thenableResult(result),
		single: () => promise,
		maybeSingle: () => promise,
	});
}

function buildUpdateChain(table: string, payload: unknown) {
	const filters: Record<string, unknown> = {};
	return {
		eq: (col: string, val: unknown) => {
			filters[col] = val;
			recordedCalls.push({ table, op: 'update', payload, filters });
			return thenableResult(tableResults[`${table}:update`] ?? { data: { id: 'agr-1' }, error: null });
		},
	};
}

const emptyReadChain = {
	select: () => ({
		eq: () => ({
			maybeSingle: () => Promise.resolve({ data: null, error: null }),
		}),
	}),
};

const supabaseMock = {
	from: (table: string) => ({
		...emptyReadChain,
		update: (payload: unknown) => buildUpdateChain(table, payload),
		insert: (payload: unknown) => ({
			select: () => ({
				single: () => {
					recordedCalls.push({ table, op: 'insert', payload, filters: {} });
					return Promise.resolve(tableResults[`${table}:insert`] ?? { data: { id: 'agr-new' }, error: null });
				},
			}),
		}),
	}),
	functions: {
		invoke: (fn: string, body?: { body?: unknown }) => {
			if (fn === 'send-template-email') return Promise.resolve({ data: null, error: null });
			recordedCalls.push({ table: fn, op: 'insert', payload: body?.body ?? null, filters: {} });
			const key = fn === 'create-duo-agreements' ? 'create-duo-agreements' : 'send-incasso-invite';
			return Promise.resolve(tableResults[key] ?? { data: null, error: null });
		},
	},
};

mock.module('../../../src/integrations/supabase/client', () => ({
	supabase: supabaseMock,
}));

mock.module('@/integrations/supabase/client', () => ({
	supabase: supabaseMock,
}));

function freeSlot(overrides: Partial<SlotWithStatus> = {}): SlotWithStatus {
	return {
		day_of_week: 1,
		start_time: '09:00',
		end_time: '10:00',
		status: 'free',
		totalOccurrences: 10,
		occupiedOccurrences: 0,
		...overrides,
	};
}

function baseForm(overrides: Partial<WizardSaveForm> = {}): WizardSaveForm {
	return {
		studentUserId: 'stu-1',
		lessonTypeId: 'lt-1',
		teacherUserId: 'tea-1',
		slot: freeSlot(),
		partnerStudentUserId: null,
		selectedOptionSnapshot: null,
		startDate: '2026-09-01',
		endDate: '2027-07-31',
		paymentMethod: 'stripe',
		sepaMandateId: null,
		...overrides,
	};
}

function duoForm(overrides: Partial<WizardSaveForm> = {}): WizardSaveForm {
	return baseForm({
		partnerStudentUserId: 'stu-2',
		selectedOptionSnapshot: { duration_minutes: 45, frequency: 'weekly', price_per_lesson: 25 },
		...overrides,
	});
}

function mockAgreementRow(overrides: Partial<AgreementTableRow> = {}): AgreementTableRow {
	return {
		id: 'agr-1',
		day_of_week: 1,
		start_time: '09:00',
		start_date: '2026-09-01',
		end_date: null,
		is_active: true,
		student_user_id: 'stu-1',
		lesson_type_id: 'lt-1',
		duration_minutes: 60,
		frequency: 'weekly',
		price_per_lesson: 30,
		created_at: '2026-01-01T00:00:00Z',
		notes: null,
		payment_method: 'stripe',
		sepa_mandate_id: null,
		teacher_user_id: 'tea-1',
		student: {
			first_name: 'Jan',
			last_name: 'Jansen',
			avatar_url: null,
			email: 'jan@example.com',
		},
		teacher: {
			first_name: 'Piet',
			last_name: 'Docent',
			avatar_url: null,
			email: 'piet@example.com',
		},
		lesson_type: { id: 'lt-1', name: 'Piano', icon: 'piano', color: '#000000' },
		...overrides,
	};
}

describe('saveWizardAgreement', () => {
	let saveWizardAgreement: typeof import('../../../src/lib/agreements/wizardSaveHelpers').saveWizardAgreement;
	const navigateCalls: string[] = [];
	const recordNavigate: NavigateFunction = (to) => {
		navigateCalls.push(typeof to === 'string' ? to : String(to));
	};

	beforeAll(async () => {
		({ saveWizardAgreement } = await import('../../../src/lib/agreements/wizardSaveHelpers'));
	});

	beforeEach(() => {
		toastMessages.length = 0;
		recordedCalls.length = 0;
		tableResults = {};
		navigateCalls.length = 0;
	});

	it('returns false when required fields are missing', async () => {
		const result = await saveWizardAgreement({
			form: baseForm({ studentUserId: null }),
			agreement: null,
			isDuoLesson: false,
			fromRequestId: null,
			fromTrialId: null,
			navigate: recordNavigate,
		});
		expect(result).toBe(false);
		expect(navigateCalls).toHaveLength(0);
		expect(toastMessages).toEqual([{ type: 'error', message: 'Selecteer alle verplichte velden' }]);
	});

	it('returns false when the selected slot is occupied', async () => {
		const result = await saveWizardAgreement({
			form: baseForm({ slot: freeSlot({ status: 'occupied' }) }),
			agreement: null,
			isDuoLesson: false,
			fromRequestId: null,
			fromTrialId: null,
			navigate: recordNavigate,
		});
		expect(result).toBe(false);
		expect(toastMessages).toEqual([{ type: 'error', message: 'Selecteer alle verplichte velden' }]);
	});

	it('returns false for duo save when partner equals the student', async () => {
		const result = await saveWizardAgreement({
			form: duoForm({ partnerStudentUserId: 'stu-1' }),
			agreement: null,
			isDuoLesson: true,
			fromRequestId: null,
			fromTrialId: null,
			navigate: recordNavigate,
		});
		expect(result).toBe(false);
		expect(toastMessages).toEqual([{ type: 'error', message: 'Kies een duo-partner (verschillende leerling)' }]);
	});

	it('returns false for duo save when no lesson option is selected', async () => {
		const result = await saveWizardAgreement({
			form: duoForm({ selectedOptionSnapshot: null }),
			agreement: null,
			isDuoLesson: true,
			fromRequestId: null,
			fromTrialId: null,
			navigate: recordNavigate,
		});
		expect(result).toBe(false);
		expect(toastMessages).toEqual([{ type: 'error', message: 'Selecteer een lesoptie' }]);
	});

	it('returns false for sepa save without a mandate id', async () => {
		const result = await saveWizardAgreement({
			form: baseForm({ paymentMethod: 'sepa', sepaMandateId: null }),
			agreement: null,
			isDuoLesson: false,
			fromRequestId: null,
			fromTrialId: null,
			navigate: recordNavigate,
		});
		expect(result).toBe(false);
		expect(toastMessages).toEqual([
			{ type: 'error', message: 'Kies een SEPA-mandaat of een andere betaalmethode' },
		]);
	});

	it('saves a new agreement and navigates to agreements', async () => {
		const result = await saveWizardAgreement({
			form: baseForm(),
			agreement: null,
			isDuoLesson: false,
			fromRequestId: null,
			fromTrialId: null,
			navigate: recordNavigate,
		});
		expect(result).toBe(true);
		expect(navigateCalls).toEqual(['/agreements']);
		expect(toastMessages).toEqual([{ type: 'success', message: 'Overeenkomst toegevoegd' }]);
	});

	it('updates an existing agreement', async () => {
		const result = await saveWizardAgreement({
			form: baseForm(),
			agreement: mockAgreementRow(),
			isDuoLesson: false,
			fromRequestId: null,
			fromTrialId: null,
			navigate: recordNavigate,
		});
		expect(result).toBe(true);
		expect(recordedCalls[0]?.op).toBe('update');
		expect(toastMessages).toEqual([{ type: 'success', message: 'Overeenkomst bijgewerkt' }]);
	});

	it('navigates to signup requests after saving from a request', async () => {
		const result = await saveWizardAgreement({
			form: baseForm(),
			agreement: null,
			isDuoLesson: false,
			fromRequestId: 'req-1',
			fromTrialId: null,
			navigate: recordNavigate,
		});
		expect(result).toBe(true);
		expect(navigateCalls).toEqual(['/aanmeldingen']);
	});

	it('navigates to trial lessons after saving from a trial lesson', async () => {
		const result = await saveWizardAgreement({
			form: baseForm(),
			agreement: null,
			isDuoLesson: false,
			fromRequestId: null,
			fromTrialId: 'trial-1',
			navigate: recordNavigate,
		});
		expect(result).toBe(true);
		expect(navigateCalls).toEqual(['/trial-lessons']);
	});

	it('shows the sepa toast for a new agreement', async () => {
		const result = await saveWizardAgreement({
			form: baseForm({ paymentMethod: 'sepa', sepaMandateId: 'mandate-1' }),
			agreement: null,
			isDuoLesson: false,
			fromRequestId: null,
			fromTrialId: null,
			navigate: recordNavigate,
		});
		expect(result).toBe(true);
		expect(toastMessages).toEqual([
			{ type: 'success', message: 'Overeenkomst toegevoegd — SEPA-incasso gekoppeld' },
		]);
	});

	it('returns false when upsert fails with a unique constraint error', async () => {
		tableResults['lesson_agreements:insert'] = { data: null, error: { message: 'duplicate key unique violation' } };
		const result = await saveWizardAgreement({
			form: baseForm(),
			agreement: null,
			isDuoLesson: false,
			fromRequestId: null,
			fromTrialId: null,
			navigate: recordNavigate,
		});
		expect(result).toBe(false);
		expect(toastMessages).toEqual([{ type: 'error', message: 'Deze combinatie bestaat al' }]);
	});

	it('returns false when duo agreements cannot be created', async () => {
		tableResults['create-duo-agreements'] = { data: null, error: { message: 'duo failed' } };
		const result = await saveWizardAgreement({
			form: duoForm(),
			agreement: null,
			isDuoLesson: true,
			fromRequestId: null,
			fromTrialId: null,
			navigate: recordNavigate,
		});
		expect(result).toBe(false);
		expect(toastMessages).toEqual([{ type: 'error', message: 'duo failed' }]);
		expect(navigateCalls).toHaveLength(0);
	});

	it('routes duo saves through createAndNotifyDuoAgreements', async () => {
		tableResults['create-duo-agreements'] = {
			data: { agreement_ids: ['agr-1', 'agr-2'], duo_pair_id: 'pair-1' },
			error: null,
		};
		tableResults['send-incasso-invite'] = { data: null, error: null };
		const result = await saveWizardAgreement({
			form: duoForm(),
			agreement: null,
			isDuoLesson: true,
			fromRequestId: 'req-1',
			fromTrialId: null,
			navigate: recordNavigate,
		});
		expect(result).toBe(true);
		expect(navigateCalls).toEqual(['/agreements']);
		expect(toastMessages).toEqual([
			{ type: 'success', message: 'Duo-overeenkomsten toegevoegd — betaaluitnodigingen verstuurd' },
		]);
		expect(recordedCalls[0]?.payload).toEqual({
			student_user_id_a: 'stu-1',
			student_user_id_b: 'stu-2',
			teacher_user_id: 'tea-1',
			lesson_type_id: 'lt-1',
			day_of_week: 1,
			start_time: '09:00',
			duration_minutes: 45,
			frequency: 'weekly',
			price_per_lesson: 25,
			start_date: '2026-09-01',
			end_date: '2027-07-31',
			signup_source: 'public_form',
		});
	});

	it('shows warning toast when duo invites fail', async () => {
		tableResults['create-duo-agreements'] = {
			data: { agreement_ids: ['agr-1', 'agr-2'], duo_pair_id: 'pair-1' },
			error: null,
		};
		tableResults['send-incasso-invite'] = { data: null, error: { message: 'invite failed' } };
		const result = await saveWizardAgreement({
			form: duoForm(),
			agreement: null,
			isDuoLesson: true,
			fromRequestId: null,
			fromTrialId: null,
			navigate: recordNavigate,
		});
		expect(result).toBe(true);
		expect(toastMessages).toEqual([
			{
				type: 'warning',
				message: 'Duo-overeenkomsten opgeslagen, maar 2 betaaluitnodiging(en) konden niet worden verstuurd',
			},
		]);
	});
});
