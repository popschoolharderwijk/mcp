import { describe, expect, it } from 'bun:test';
import {
	mapLessonTypeOptionsToForm,
	mapLessonTypeRowToForm,
	resolveLessonTypeLoadFailure,
	shouldSkipLessonTypeLoad,
} from '../../../src/lib/lesson-types/lessonTypeLoaderHelpers';
import type { LessonTypeOptionRow, LessonTypeRow } from '../../../src/types/lesson-agreements';

const lessonType: LessonTypeRow = {
	id: 'lt-1',
	name: 'Piano',
	description: 'Klassiek piano',
	icon: 'piano',
	color: '#112233',
	cost_center: 'KP-1',
	is_group_lesson: false,
	is_duo_lesson: true,
	is_active: true,
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
	created_by: null,
	updated_by: null,
};

const option: LessonTypeOptionRow = {
	id: 'opt-1',
	lesson_type_id: 'lt-1',
	duration_minutes: 45,
	frequency: 'weekly',
	price_per_lesson: 25,
	price_per_lesson_under_21_cents: 2000,
	price_per_lesson_adult_cents: 2500,
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
	created_by: null,
	updated_by: null,
};

describe('shouldSkipLessonTypeLoad', () => {
	it('skips load for new lesson types', () => {
		expect(shouldSkipLessonTypeLoad('new')).toBe(true);
		expect(shouldSkipLessonTypeLoad(undefined)).toBe(true);
	});

	it('loads existing lesson type ids', () => {
		expect(shouldSkipLessonTypeLoad('lt-1')).toBe(false);
	});
});

describe('mapLessonTypeRowToForm', () => {
	it('maps lesson type row fields to form state', () => {
		expect(mapLessonTypeRowToForm(lessonType)).toEqual({
			name: 'Piano',
			description: 'Klassiek piano',
			icon: 'piano',
			color: '#112233',
			cost_center: 'KP-1',
			is_group_lesson: false,
			is_duo_lesson: true,
			is_active: true,
		});
	});
});

describe('mapLessonTypeOptionsToForm', () => {
	it('maps option rows to form rows with price inputs', () => {
		expect(mapLessonTypeOptionsToForm([option])).toEqual([
			{
				id: 'opt-1',
				duration_minutes: '45',
				frequency: 'weekly',
				label: '',
				billing_kind: 'monthly' as const,
				has_adult_tariff: true,
				effective_from: '2026-09-01',
				amount_under_21: '20.00',
				amount_adult: '25.00',
				tariffs: [],
			},
		]);
	});
});

describe('resolveLessonTypeLoadFailure', () => {
	it('returns true when type data is missing', () => {
		expect(resolveLessonTypeLoadFailure(null, null)).toBe(true);
	});

	it('returns false when type data loaded successfully', () => {
		expect(resolveLessonTypeLoadFailure(null, lessonType)).toBe(false);
	});
});
