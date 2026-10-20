import { afterEach, beforeAll, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import * as lessonTypeOptionPersistence from '../../../src/pages/lesson-type-info/lessonTypeOptionPersistence';
import type { OptionModalFormState, OptionRowWithKey } from '../../../src/pages/lesson-type-info/types';

mock.module('sonner', () => ({
	toast: { error: () => {}, success: () => {} },
}));

const tariff = { id: 't-1', effective_from: '2026-09-01', amount_under_21_cents: 7338, amount_adult_cents: 8879 };

const modalForm: OptionModalFormState = {
	duration_minutes: '30',
	frequency: 'weekly',
	label: '',
	billing_kind: 'monthly',
	has_adult_tariff: true,
	effective_from: '2026-09-01',
	amount_under_21: '73.38',
	amount_adult: '88.79',
};

const editingNew = { _newId: 'new-1', tariffs: [] } as unknown as OptionRowWithKey;
const editingExisting = { id: 'option-1', tariffs: [] } as unknown as OptionRowWithKey;

function applyState<T>(target: T[]) {
	return (updater: T[] | ((prev: T[]) => T[])) => {
		const next = typeof updater === 'function' ? updater(target) : updater;
		target.splice(0, target.length, ...next);
	};
}

describe('lessonTypeOptionModalPersistHelpers', () => {
	let helpers: typeof import('../../../src/pages/lesson-type-info/lessonTypeOptionModalPersistHelpers');

	beforeAll(async () => {
		helpers = await import('../../../src/pages/lesson-type-info/lessonTypeOptionModalPersistHelpers');
	});

	beforeEach(() => {
		spyOn(lessonTypeOptionPersistence, 'persistNewOptionInsert').mockResolvedValue({
			option: { id: 'option-new', duration_minutes: 30, frequency: 'weekly' } as never,
			tariff,
		});
		spyOn(lessonTypeOptionPersistence, 'persistExistingOptionUpdate').mockResolvedValue(tariff);
	});

	afterEach(() => {
		mock.restore();
	});

	it('adds a new option locally when not in edit mode', async () => {
		const form: OptionRowWithKey[] = [];
		const ok = await helpers.runPersistNewOptionFlow({
			editing: editingNew,
			modalForm,
			isEditMode: false,
			lessonType: null,
			setOptionsForm: applyState(form),
			setOptions: () => {},
			setSaving: () => {},
		});
		expect(ok).toBe(true);
		expect(form).toHaveLength(1);
		expect(form[0]?.tariffs).toEqual([]);
	});

	it('persists a new option with its tariff in edit mode', async () => {
		const form: OptionRowWithKey[] = [];
		const options: unknown[] = [];
		const ok = await helpers.runPersistNewOptionFlow({
			editing: editingNew,
			modalForm,
			isEditMode: true,
			lessonType: { id: 'lesson-type-1' } as never,
			setOptionsForm: applyState(form),
			setOptions: applyState(options) as never,
			setSaving: () => {},
		});
		expect(ok).toBe(true);
		expect(form[0]?.id).toBe('option-new');
		expect(form[0]?.tariffs).toEqual([tariff]);
		expect(options).toHaveLength(1);
	});

	it('rolls back the new row when persisting fails', async () => {
		spyOn(lessonTypeOptionPersistence, 'persistNewOptionInsert').mockResolvedValue(null);
		const form: OptionRowWithKey[] = [];
		const ok = await helpers.runPersistNewOptionFlow({
			editing: editingNew,
			modalForm,
			isEditMode: true,
			lessonType: { id: 'lesson-type-1' } as never,
			setOptionsForm: applyState(form),
			setOptions: () => {},
			setSaving: () => {},
		});
		expect(ok).toBe(false);
		expect(form).toHaveLength(0);
	});

	it('returns true without persisting an existing option outside edit mode', async () => {
		const ok = await helpers.runPersistExistingOptionFlow({
			editing: editingExisting,
			modalForm,
			isEditMode: false,
			lessonType: null,
			setOptions: () => {},
			setOptionsForm: () => {},
			setSaving: () => {},
		});
		expect(ok).toBe(true);
	});

	it('updates the existing option and its tariff history in edit mode', async () => {
		const options = [{ id: 'option-1', duration_minutes: 45, frequency: 'weekly' }];
		const form = [{ ...editingExisting, duration_minutes: '45' }] as OptionRowWithKey[];
		const ok = await helpers.runPersistExistingOptionFlow({
			editing: editingExisting,
			modalForm,
			isEditMode: true,
			lessonType: { id: 'lesson-type-1' } as never,
			setOptions: applyState(options) as never,
			setOptionsForm: applyState(form),
			setSaving: () => {},
		});
		expect(ok).toBe(true);
		expect(options[0]?.duration_minutes).toBe(30);
		expect(form[0]?.tariffs).toEqual([tariff]);
	});
});
