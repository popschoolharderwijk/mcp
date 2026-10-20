import { beforeAll, describe, expect, it, mock } from 'bun:test';
import type { OptionModalFormState, OptionRowWithKey } from '../../../src/pages/lesson-type-info/types';

mock.module('../../../src/integrations/supabase/client', () => ({
	supabase: { from: () => ({}) },
}));

mock.module('@/integrations/supabase/client', () => ({
	supabase: { from: () => ({}) },
}));

const optionsForm: OptionRowWithKey[] = [
	{
		_newId: 'new-1',
		id: 'opt-1',
		duration_minutes: '45',
		frequency: 'weekly',
		label: '',
		billing_kind: 'monthly' as const,
		has_adult_tariff: true,
		effective_from: '2026-09-01',
		amount_under_21: '25.00',
		amount_adult: '30.00',
		tariffs: [],
	},
];

const modalForm: OptionModalFormState = {
	duration_minutes: '45',
	frequency: 'weekly',
	label: '',
	billing_kind: 'monthly' as const,
	has_adult_tariff: true,
	effective_from: '2026-09-01',
	amount_under_21: '25.00',
	amount_adult: '30.00',
};

describe('isDuplicateOption', () => {
	let isDuplicateOption: typeof import('../../../src/pages/lesson-type-info/lessonTypeOptionPersistence').isDuplicateOption;
	let buildOptionFormRow: typeof import('../../../src/pages/lesson-type-info/lessonTypeOptionPersistence').buildOptionFormRow;
	let mergeTariffIntoHistory: typeof import('../../../src/pages/lesson-type-info/lessonTypeOptionPersistence').mergeTariffIntoHistory;

	beforeAll(async () => {
		({ isDuplicateOption, buildOptionFormRow, mergeTariffIntoHistory } = await import(
			'../../../src/pages/lesson-type-info/lessonTypeOptionPersistence'
		));
	});

	it('returns true when duration and frequency match for new options', () => {
		expect(isDuplicateOption(optionsForm, modalForm, optionsForm[0], false)).toBe(true);
	});

	it('returns false when editing the same existing option', () => {
		expect(isDuplicateOption(optionsForm, modalForm, optionsForm[0], true)).toBe(false);
	});

	it('returns false when frequency differs', () => {
		expect(isDuplicateOption(optionsForm, { ...modalForm, frequency: 'biweekly' }, optionsForm[0], false)).toBe(
			false,
		);
	});

	it('returns false when duration differs', () => {
		expect(isDuplicateOption(optionsForm, { ...modalForm, duration_minutes: '60' }, optionsForm[0], false)).toBe(
			false,
		);
	});

	it('builds updated option row and merges the saved tariff newest first', () => {
		const old = { id: 't-old', effective_from: '2025-09-01', amount_under_21_cents: 2400, amount_adult_cents: 2900 };
		const saved = { id: 't-new', effective_from: '2026-09-01', amount_under_21_cents: 2500, amount_adult_cents: 3000 };
		expect(buildOptionFormRow({ ...optionsForm[0], tariffs: [old] }, modalForm, saved)).toEqual({
			...modalForm,
			_newId: 'new-1',
			id: 'opt-1',
			tariffs: [saved, old],
		});
	});

	it('replaces a tariff with the same effective date', () => {
		const first = { id: 't-1', effective_from: '2026-09-01', amount_under_21_cents: 1, amount_adult_cents: 2 };
		const second = { ...first, amount_under_21_cents: 7338 };
		expect(mergeTariffIntoHistory([first], second)).toEqual([second]);
	});
});
