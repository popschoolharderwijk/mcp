import { describe, expect, it } from 'bun:test';
import {
	getOptionModalValidationError,
	getOptionRowValidationError,
	parseOptionModalValues,
} from '../../../src/pages/lesson-type-info/validateLessonTypeOption';

const validOptionForm = {
	duration_minutes: '45',
	frequency: 'weekly' as const,
	label: '',
	billing_kind: 'monthly' as const,
	has_adult_tariff: true,
	effective_from: '2026-09-01',
	amount_under_21: '20.00',
	amount_adult: '25.00',
};

describe('getOptionModalValidationError', () => {
	it('returns null for valid option modal values', () => {
		expect(getOptionModalValidationError(validOptionForm)).toBe(null);
	});

	it('returns an error for invalid duration', () => {
		expect(
			getOptionModalValidationError({
				...validOptionForm,
				duration_minutes: '0',
			}),
		).toBe('Duur moet een positief getal zijn');
	});

	it('returns an error for invalid under-21 price', () => {
		expect(
			getOptionModalValidationError({
				...validOptionForm,
				price_per_lesson_under_21: 'abc',
			}),
		).toBe('Prijs <21 moet een positief getal zijn');
	});

	it('returns an error for invalid adult price', () => {
		expect(
			getOptionModalValidationError({
				...validOptionForm,
				price_per_lesson_adult: '-1',
			}),
		).toBe('Prijs 21+ moet een positief getal zijn');
	});
});

describe('parseOptionModalValues', () => {
	it('parses numeric option modal values', () => {
		expect(parseOptionModalValues(validOptionForm)).toEqual({
			durationMinutes: 45,
			priceUnder21: 20,
		});
	});
});

describe('getOptionRowValidationError', () => {
	it('returns null for a valid option row', () => {
		expect(
			getOptionRowValidationError(
				{
					duration_minutes: '45',
					label: '',
					billing_kind: 'monthly' as const,
					has_adult_tariff: true,
					effective_from: '2026-09-01',
					amount_under_21: '20.00',
					amount_adult: '25.00',
				},
				0,
			),
		).toBe(null);
	});

	it('returns a row-specific duration error', () => {
		expect(
			getOptionRowValidationError(
				{
					duration_minutes: 'abc',
					label: '',
					billing_kind: 'monthly' as const,
					has_adult_tariff: true,
					effective_from: '2026-09-01',
					amount_under_21: '20.00',
					amount_adult: '25.00',
				},
				1,
			),
		).toBe('Optie 2: duur moet een positief getal zijn');
	});

	it('returns a row-specific under-21 price error', () => {
		expect(
			getOptionRowValidationError(
				{
					duration_minutes: '45',
					label: '',
					billing_kind: 'monthly' as const,
					has_adult_tariff: true,
					effective_from: '2026-09-01',
					amount_under_21: '0',
					amount_adult: '25.00',
				},
				2,
			),
		).toBe('Optie 3: prijs <21 moet een positief getal zijn');
	});

	it('returns a row-specific adult price error', () => {
		expect(
			getOptionRowValidationError(
				{
					duration_minutes: '45',
					label: '',
					billing_kind: 'monthly' as const,
					has_adult_tariff: true,
					effective_from: '2026-09-01',
					amount_under_21: '20.00',
					amount_adult: '0',
				},
				0,
			),
		).toBe('Optie 1: prijs 21+ moet een positief getal zijn');
	});
});
