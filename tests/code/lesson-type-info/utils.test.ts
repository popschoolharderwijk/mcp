import { describe, expect, it } from 'bun:test';
import {
	buildOptionDbPayloadFromForm,
	centsToInput,
	formatOptionPrice,
	optionSort,
} from '../../../src/pages/lesson-type-info/utils';
import type { LessonTypeOptionFormRow } from '../../../src/types/lesson-agreements';

function makeOptionRow(overrides: Partial<LessonTypeOptionFormRow> = {}): LessonTypeOptionFormRow {
	return {
		duration_minutes: '45',
		frequency: 'weekly',
		label: '',
		billing_kind: 'monthly',
		has_adult_tariff: true,
		effective_from: '2026-09-01',
		amount_under_21: '20.00',
		amount_adult: '25.00',
		tariffs: [],
		...overrides,
	};
}

describe('centsToInput', () => {
	it('returns an empty string for null or undefined cents', () => {
		expect(centsToInput(null)).toBe('');
		expect(centsToInput(undefined)).toBe('');
	});

	it('formats cents as euros with two decimals', () => {
		expect(centsToInput(2550)).toBe('25.50');
	});
});

describe('optionSort', () => {
	it('sorts by duration first', () => {
		const shortOption = makeOptionRow({ duration_minutes: '30' });
		const longOption = makeOptionRow({ duration_minutes: '60' });
		expect(optionSort(shortOption, longOption)).toBe(-30);
		expect(optionSort(longOption, shortOption)).toBe(30);
	});

	it('sorts by frequency when duration matches', () => {
		const weeklyOption = makeOptionRow({ duration_minutes: '45', frequency: 'weekly' });
		const biweeklyOption = makeOptionRow({ duration_minutes: '45', frequency: 'biweekly' });
		expect(optionSort(weeklyOption, biweeklyOption)).toBe(-1);
		expect(optionSort(biweeklyOption, weeklyOption)).toBe(1);
	});
});

describe('buildOptionDbPayloadFromForm', () => {
	it('builds the database payload from form values', () => {
		expect(buildOptionDbPayloadFromForm('45', 'weekly', '20.00', '25.50', 2500)).toEqual({
			duration_minutes: 45,
			frequency: 'weekly',
			price_per_lesson: 2500,
			price_per_lesson_under_21_cents: 2000,
			price_per_lesson_adult_cents: 2550,
		});
	});

	it('converts invalid price input to zero cents', () => {
		expect(buildOptionDbPayloadFromForm('45', 'weekly', '', 'abc', 0)).toEqual({
			duration_minutes: 45,
			frequency: 'weekly',
			price_per_lesson: 0,
			price_per_lesson_under_21_cents: 0,
			price_per_lesson_adult_cents: 0,
		});
	});
});

describe('formatOptionPrice', () => {
	it('returns a dash for invalid values', () => {
		expect(formatOptionPrice('abc')).toBe('—');
	});

	it('formats valid euro values for nl-NL', () => {
		expect(formatOptionPrice('25.5')).toBe('€ 25,50');
	});
});
