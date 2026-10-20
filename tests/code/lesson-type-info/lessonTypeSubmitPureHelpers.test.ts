import { describe, expect, it } from 'bun:test';
import {
	buildLessonTypeOptionRowPayload,
	collectRemovedLessonTypeOptionIds,
	resolveLessonTypeCanSubmit,
	resolveLessonTypeSaveMode,
	resolveLessonTypeSubmitLabels,
} from '../../../src/pages/lesson-type-info/lessonTypeSubmitPureHelpers';
import type { OptionRowWithKey } from '../../../src/pages/lesson-type-info/types';
import type { LessonTypeFormState, LessonTypeOptionRow, LessonTypeRow } from '../../../src/types/lesson-agreements';

const lessonType = { id: 'lt-1' } as LessonTypeRow;

const form: LessonTypeFormState = {
	name: 'Piano',
	description: '',
	icon: 'piano',
	color: '#FF5733',
	cost_center: '',
	is_group_lesson: false,
	is_duo_lesson: false,
	is_active: true,
};

const optionRow: OptionRowWithKey = {
	_newId: 'new-1',
	duration_minutes: '45',
	frequency: 'weekly',
	label: '',
	billing_kind: 'monthly',
	has_adult_tariff: true,
	effective_from: '2026-09-01',
	amount_under_21: '20.00',
	amount_adult: '25.00',
	tariffs: [],
};

describe('resolveLessonTypeSaveMode', () => {
	it('returns update mode in edit mode with lesson type', () => {
		expect(resolveLessonTypeSaveMode(true, lessonType)).toEqual({ kind: 'update', lessonTypeId: 'lt-1' });
	});

	it('returns create mode in create mode', () => {
		expect(resolveLessonTypeSaveMode(false, null)).toEqual({ kind: 'create' });
	});

	it('returns null in edit mode without lesson type', () => {
		expect(resolveLessonTypeSaveMode(true, null)).toBeNull();
	});
});

describe('buildLessonTypeOptionRowPayload', () => {
	it('builds database payload from option form row', () => {
		expect(buildLessonTypeOptionRowPayload(optionRow)).toEqual({
			duration_minutes: 45,
			frequency: 'weekly',
			price_per_lesson: 25,
			price_per_lesson_under_21_cents: 2000,
			price_per_lesson_adult_cents: 2500,
		});
	});
});

describe('collectRemovedLessonTypeOptionIds', () => {
	it('returns ids for options removed from the form', () => {
		const options = [{ id: 'opt-1' }, { id: 'opt-2' }] as LessonTypeOptionRow[];
		const optionsForm = [{ id: 'opt-1' }] as OptionRowWithKey[];
		expect(collectRemovedLessonTypeOptionIds(options, optionsForm)).toEqual(['opt-2']);
	});
});

describe('resolveLessonTypeCanSubmit', () => {
	it('returns true when form is complete and not saving', () => {
		expect(resolveLessonTypeCanSubmit(form, [optionRow], false)).toBe(true);
	});

	it('returns false when saving', () => {
		expect(resolveLessonTypeCanSubmit(form, [optionRow], true)).toBe(false);
	});

	it('returns false when required fields are missing', () => {
		expect(resolveLessonTypeCanSubmit({ ...form, name: '' }, [optionRow], false)).toBe(false);
	});
});

describe('resolveLessonTypeSubmitLabels', () => {
	it('returns edit labels in edit mode', () => {
		expect(resolveLessonTypeSubmitLabels(true)).toEqual({
			submitLabel: 'Opslaan',
			savingLabel: 'Opslaan...',
			successMessage: 'Lessoort bijgewerkt',
		});
	});

	it('returns create labels in create mode', () => {
		expect(resolveLessonTypeSubmitLabels(false)).toEqual({
			submitLabel: 'Toevoegen',
			savingLabel: 'Toevoegen...',
			successMessage: 'Lessoort aangemaakt',
		});
	});
});
