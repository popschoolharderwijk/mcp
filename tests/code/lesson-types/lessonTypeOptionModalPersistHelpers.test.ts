import { afterEach, beforeAll, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import * as lessonTypeOptionPersistence from '../../../src/pages/lesson-type-info/lessonTypeOptionPersistence';

let insertResult: { data: unknown; error: unknown } = {
	data: { id: 'option-new', duration_minutes: 45, frequency: 'weekly', price_per_lesson: 25 },
	error: null,
};

mock.module('sonner', () => ({
	toast: { error: () => {}, success: () => {} },
}));

describe('lessonTypeOptionModalPersistHelpers', () => {
	let helpers: typeof import('../../../src/pages/lesson-type-info/lessonTypeOptionModalPersistHelpers');

	beforeAll(async () => {
		helpers = await import('../../../src/pages/lesson-type-info/lessonTypeOptionModalPersistHelpers');
	});

	beforeEach(() => {
		insertResult = {
			data: { id: 'option-new', duration_minutes: 45, frequency: 'weekly', price_per_lesson: 25 },
			error: null,
		};
		spyOn(lessonTypeOptionPersistence, 'buildOptionFormRow').mockImplementation(
			(editing, _modalForm, priceAdult) =>
				({
					_newId: editing._newId,
					duration_minutes: '45',
					frequency: 'weekly',
					price_per_lesson: String(priceAdult),
				}) as never,
		);
		spyOn(lessonTypeOptionPersistence, 'persistNewOptionInsert').mockImplementation(
			async () => insertResult.data as never,
		);
		spyOn(lessonTypeOptionPersistence, 'persistExistingOptionUpdate').mockResolvedValue(true);
	});

	afterEach(() => {
		mock.restore();
	});

	const editing = { _newId: 'new-1' } as const;
	const modalForm = {
		duration_minutes: '45',
		frequency: 'weekly' as const,
		price_per_lesson_youth: '20',
		price_per_lesson_adult: '25',
	};

	describe('runPersistNewOptionFlow', () => {
		it('adds option locally when not in edit mode', async () => {
			const optionsForm: unknown[] = [];
			const ok = await helpers.runPersistNewOptionFlow({
				editing: editing as never,
				modalForm,
				priceAdult: 25,
				isEditMode: false,
				lessonType: null,
				setOptionsForm: (updater) => {
					const next = typeof updater === 'function' ? updater(optionsForm as never) : updater;
					optionsForm.splice(0, optionsForm.length, ...next);
				},
				setOptions: () => {},
				setSaving: () => {},
			});
			expect(ok).toBe(true);
			expect(optionsForm).toHaveLength(1);
		});

		it('persists option and updates ids in edit mode', async () => {
			const optionsForm: unknown[] = [];
			const options: unknown[] = [];
			const ok = await helpers.runPersistNewOptionFlow({
				editing: editing as never,
				modalForm,
				priceAdult: 25,
				isEditMode: true,
				lessonType: { id: 'lesson-type-1' } as never,
				setOptionsForm: (updater) => {
					const next = typeof updater === 'function' ? updater(optionsForm as never) : updater;
					optionsForm.splice(0, optionsForm.length, ...next);
				},
				setOptions: (updater) => {
					const next = typeof updater === 'function' ? updater(options as never) : updater;
					options.splice(0, options.length, ...next);
				},
				setSaving: () => {},
			});
			expect(ok).toBe(true);
			expect(options).toHaveLength(1);
			expect((optionsForm[0] as { id?: string })?.id).toBe('option-new');
		});
	});

	describe('runPersistExistingOptionFlow', () => {
		it('returns true without persisting when not in edit mode', async () => {
			const ok = await helpers.runPersistExistingOptionFlow({
				editing: { id: 'option-1' } as never,
				modalForm,
				priceAdult: 25,
				isEditMode: false,
				lessonType: null,
				setOptions: () => {},
				setSaving: () => {},
			});
			expect(ok).toBe(true);
		});

		it('updates options after a successful persist in edit mode', async () => {
			const options = [{ id: 'option-1', duration_minutes: 30, frequency: 'weekly', price_per_lesson: 20 }];
			const ok = await helpers.runPersistExistingOptionFlow({
				editing: { id: 'option-1' } as never,
				modalForm,
				priceAdult: 25,
				isEditMode: true,
				lessonType: { id: 'lesson-type-1' } as never,
				setOptions: (updater) => {
					const next = typeof updater === 'function' ? updater(options as never) : updater;
					options.splice(0, options.length, ...next);
				},
				setSaving: () => {},
			});
			expect(ok).toBe(true);
			expect(options[0]?.duration_minutes).toBe(45);
			expect(options[0]?.price_per_lesson).toBe(25);
		});
	});
});
