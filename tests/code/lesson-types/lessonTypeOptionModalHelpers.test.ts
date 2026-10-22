import { beforeAll, describe, expect, it, mock } from 'bun:test';
import {
	buildOptionModalFormFromEditing,
	isEditingExistingOption,
	resolveSaveOptionInModalFlow,
	runConfirmRemoveOption,
} from '../../../src/pages/lesson-type-info/lessonTypeOptionModalHelpers';

const toastCalls: { kind: 'error' | 'success'; message: string }[] = [];

mock.module('sonner', () => ({
	toast: {
		error: (message: string) => {
			toastCalls.push({ kind: 'error', message });
		},
		success: (message: string) => {
			toastCalls.push({ kind: 'success', message });
		},
	},
}));

const editingOption = {
	id: 'option-1',
	duration_minutes: '45',
	frequency: 'weekly' as const,
	price_per_lesson: '25',
	price_per_lesson_youth: '20',
	price_per_lesson_adult: '25',
} as const;

describe('resolveSaveOptionInModalFlow', () => {
	it('returns abort-no-editing when option is missing', () => {
		expect(
			resolveSaveOptionInModalFlow({
				editingOption: null,
				validationError: null,
				isDuplicate: false,
				isEditExisting: false,
				isEditMode: false,
				hasLessonType: false,
			}),
		).toEqual({ kind: 'abort-no-editing' });
	});

	it('returns abort-validation when form is invalid', () => {
		expect(
			resolveSaveOptionInModalFlow({
				editingOption: editingOption as never,
				validationError: 'Duur moet een positief getal zijn',
				isDuplicate: false,
				isEditExisting: true,
				isEditMode: true,
				hasLessonType: true,
			}),
		).toEqual({ kind: 'abort-validation', message: 'Duur moet een positief getal zijn' });
	});

	it('returns update-existing with database persistence in edit mode', () => {
		expect(
			resolveSaveOptionInModalFlow({
				editingOption: editingOption as never,
				validationError: null,
				isDuplicate: false,
				isEditExisting: true,
				isEditMode: true,
				hasLessonType: true,
			}),
		).toEqual({ kind: 'update-existing', persistToDatabase: true });
	});

	it('returns create-new for new option rows', () => {
		expect(
			resolveSaveOptionInModalFlow({
				editingOption: { ...editingOption, id: undefined } as never,
				validationError: null,
				isDuplicate: false,
				isEditExisting: false,
				isEditMode: true,
				hasLessonType: true,
			}),
		).toEqual({ kind: 'create-new' });
	});
});

describe('runSaveOptionInModal', () => {
	let helpers: typeof import('../../../src/pages/lesson-type-info/lessonTypeOptionModalHelpers');

	beforeAll(async () => {
		helpers = await import('../../../src/pages/lesson-type-info/lessonTypeOptionModalHelpers');
	});

	it('shows validation abort toast', async () => {
		toastCalls.length = 0;
		await helpers.runSaveOptionInModal({
			flow: { kind: 'abort-validation', message: 'invalid' },
			editingOption: editingOption as never,
			optionModalForm: {
				duration_minutes: '45',
				frequency: 'weekly',
				price_per_lesson_youth: '20',
				price_per_lesson_adult: '25',
			},
			priceAdult: 25,
			updateExistingOptionInForm: () => true,
			persistExistingOption: async () => true,
			persistNewOption: async () => true,
			clearEditingOption: () => {},
		});
		expect(toastCalls).toEqual([{ kind: 'error', message: 'invalid' }]);
	});

	it('shows duplicate abort toast', async () => {
		toastCalls.length = 0;
		await helpers.runSaveOptionInModal({
			flow: { kind: 'abort-duplicate' },
			editingOption: editingOption as never,
			optionModalForm: {
				duration_minutes: '45',
				frequency: 'weekly',
				price_per_lesson_youth: '20',
				price_per_lesson_adult: '25',
			},
			priceAdult: 25,
			updateExistingOptionInForm: () => true,
			persistExistingOption: async () => true,
			persistNewOption: async () => true,
			clearEditingOption: () => {},
		});
		expect(toastCalls[0]?.message).toContain('bestaat al');
	});

	it('shows local update success toast and clears editing option', async () => {
		toastCalls.length = 0;
		let cleared = false;
		await helpers.runSaveOptionInModal({
			flow: { kind: 'update-existing', persistToDatabase: false },
			editingOption: editingOption as never,
			optionModalForm: {
				duration_minutes: '45',
				frequency: 'weekly',
				price_per_lesson_youth: '20',
				price_per_lesson_adult: '25',
			},
			priceAdult: 25,
			updateExistingOptionInForm: () => true,
			persistExistingOption: async () => true,
			persistNewOption: async () => true,
			clearEditingOption: () => {
				cleared = true;
			},
		});
		expect(cleared).toBe(true);
		expect(toastCalls).toEqual([{ kind: 'success', message: 'Optie bijgewerkt' }]);
	});

	it('keeps modal open after failed database update', async () => {
		toastCalls.length = 0;
		let cleared = false;
		await helpers.runSaveOptionInModal({
			flow: { kind: 'update-existing', persistToDatabase: true },
			editingOption: editingOption as never,
			optionModalForm: {
				duration_minutes: '45',
				frequency: 'weekly',
				price_per_lesson_youth: '20',
				price_per_lesson_adult: '25',
			},
			priceAdult: 25,
			updateExistingOptionInForm: () => true,
			persistExistingOption: async () => false,
			persistNewOption: async () => true,
			clearEditingOption: () => {
				cleared = true;
			},
		});
		expect(cleared).toBe(false);
	});

	it('clears editing option after successful database update', async () => {
		toastCalls.length = 0;
		let cleared = false;
		await helpers.runSaveOptionInModal({
			flow: { kind: 'update-existing', persistToDatabase: true },
			editingOption: editingOption as never,
			optionModalForm: {
				duration_minutes: '45',
				frequency: 'weekly',
				price_per_lesson_youth: '20',
				price_per_lesson_adult: '25',
			},
			priceAdult: 25,
			updateExistingOptionInForm: () => true,
			persistExistingOption: async () => true,
			persistNewOption: async () => true,
			clearEditingOption: () => {
				cleared = true;
			},
		});
		expect(cleared).toBe(true);
	});
});

describe('isEditingExistingOption', () => {
	it('returns true when option has id', () => {
		expect(isEditingExistingOption(editingOption as never)).toBe(true);
	});

	it('returns false for new option rows', () => {
		expect(isEditingExistingOption({ ...editingOption, id: undefined } as never)).toBe(false);
	});
});

describe('buildOptionModalFormFromEditing', () => {
	it('copies editable fields from the selected option', () => {
		expect(buildOptionModalFormFromEditing(editingOption as never)).toEqual({
			duration_minutes: '45',
			frequency: 'weekly',
			price_per_lesson_youth: '20',
			price_per_lesson_adult: '25',
		});
	});
});

describe('runConfirmRemoveOption', () => {
	it('does nothing when nothing is selected', async () => {
		let removed = false;
		await runConfirmRemoveOption({
			optionToDelete: null,
			findOptionIndex: () => 0,
			isEditMode: true,
			hasLessonType: true,
			deletePersistedOption: async () => true,
			removeOption: () => {
				removed = true;
			},
			removePersistedOptionFromState: () => {},
			setSaving: () => {},
			clearOptionToDelete: () => {},
		});
		expect(removed).toBe(false);
	});

	it('clears delete target when selected option is missing from form', async () => {
		let cleared = false;
		await runConfirmRemoveOption({
			optionToDelete: { id: 'option-1' } as never,
			findOptionIndex: () => -1,
			isEditMode: true,
			hasLessonType: true,
			deletePersistedOption: async () => true,
			removeOption: () => {},
			removePersistedOptionFromState: () => {},
			setSaving: () => {},
			clearOptionToDelete: () => {
				cleared = true;
			},
		});
		expect(cleared).toBe(true);
	});

	it('persists delete for saved options in edit mode', async () => {
		let deletedId = '';
		let removedIndex = -1;
		await runConfirmRemoveOption({
			optionToDelete: { id: 'option-1' } as never,
			findOptionIndex: () => 2,
			isEditMode: true,
			hasLessonType: true,
			deletePersistedOption: async (id) => {
				deletedId = id;
				return true;
			},
			removeOption: (index) => {
				removedIndex = index;
			},
			removePersistedOptionFromState: () => {},
			setSaving: () => {},
			clearOptionToDelete: () => {},
		});
		expect(deletedId).toBe('option-1');
		expect(removedIndex).toBe(2);
	});

	it('removes unsaved options locally', async () => {
		let removedIndex = -1;
		await runConfirmRemoveOption({
			optionToDelete: { id: undefined } as never,
			findOptionIndex: () => 1,
			isEditMode: false,
			hasLessonType: false,
			deletePersistedOption: async () => true,
			removeOption: (index) => {
				removedIndex = index;
			},
			removePersistedOptionFromState: () => {},
			setSaving: () => {},
			clearOptionToDelete: () => {},
		});
		expect(removedIndex).toBe(1);
	});
});
