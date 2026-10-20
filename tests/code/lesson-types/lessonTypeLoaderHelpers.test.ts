import { describe, expect, it } from 'bun:test';
import {
	mapLessonTypeOptionsToForm,
	mapLessonTypeRowToForm,
	resolveLessonTypeLoadFailure,
	shouldSkipLessonTypeLoad,
} from '../../../src/lib/lesson-types/lessonTypeLoaderHelpers';
import type { LessonTypeOptionWithTariffs } from '../../../src/lib/lesson-types/lessonTypeLoaderHelpers';
import type { LessonTypeRow } from '../../../src/types/lesson-agreements';

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

const option: LessonTypeOptionWithTariffs = {
	id: 'opt-1',
	lesson_type_id: 'lt-1',
	duration_minutes: 45,
	frequency: 'weekly',
	price_per_lesson: null,
	price_per_lesson_under_21_cents: null,
	price_per_lesson_adult_cents: null,
	label: null,
	billing_kind: 'monthly',
	has_adult_tariff: true,
	lesson_type_option_tariffs: [
		{ id: 't-old', effective_from: '2025-09-01', amount_under_21_cents: 1900, amount_adult_cents: 2400 },
		{ id: 't-new', effective_from: '2026-09-01', amount_under_21_cents: 2000, amount_adult_cents: 2500 },
	],
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
	it('prefills the newest tariff and keeps the history newest first', () => {
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
				tariffs: [
					{ id: 't-new', effective_from: '2026-09-01', amount_under_21_cents: 2000, amount_adult_cents: 2500 },
					{ id: 't-old', effective_from: '2025-09-01', amount_under_21_cents: 1900, amount_adult_cents: 2400 },
				],
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
