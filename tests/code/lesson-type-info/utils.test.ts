import { describe, expect, it } from 'bun:test';
import {
	buildOptionDbPayloadFromForm,
	buildTariffPayloadFromForm,
	centsToInput,
	formatOptionPrice,
	inputToCentsOrNull,
	optionSort,
} from '../../../src/pages/lesson-type-info/utils';
import type { LessonTypeOptionFormRow } from '../../../src/types/lesson-agreements';

function makeOptionRow(overrides: Partial<LessonTypeOptionFormRow> = {}): LessonTypeOptionFormRow {
	return {
		duration_minutes: '45',
		frequency: 'weekly',
		label: '',
		billing_kind: 'monthly' as const,
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

const modalForm = {
	duration_minutes: '30',
	frequency: 'weekly' as const,
	label: ' Popkoor (18+) ',
	billing_kind: 'monthly' as const,
	has_adult_tariff: true,
	effective_from: '2026-09-01',
	amount_under_21: '30,00',
	amount_adult: '36.31',
};

describe('buildOptionDbPayloadFromForm', () => {
	it('builds the lesson form payload without prices', () => {
		expect(buildOptionDbPayloadFromForm(modalForm)).toEqual({
			duration_minutes: 30,
			frequency: 'weekly',
			label: 'Popkoor (18+)',
			billing_kind: 'monthly',
			has_adult_tariff: true,
		});
	});
});

describe('buildTariffPayloadFromForm', () => {
	it('stores monthly amounts in cents with the effective date', () => {
		expect(buildTariffPayloadFromForm(modalForm)).toEqual({
			effective_from: '2026-09-01',
			amount_under_21_cents: 3000,
			amount_adult_cents: 3631,
		});
	});

	it('drops the 21+ amount when the form has no 21+ tariff', () => {
		expect(buildTariffPayloadFromForm({ ...modalForm, has_adult_tariff: false })).toMatchObject({
			amount_adult_cents: null,
		});
	});

	it('turns empty or invalid input into null', () => {
		expect(inputToCentsOrNull('')).toBeNull();
		expect(inputToCentsOrNull('abc')).toBeNull();
		expect(inputToCentsOrNull('73,38')).toBe(7338);
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
