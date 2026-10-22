import { describe, expect, it } from 'bun:test';
import {
	getOptionModalValidationError,
	getOptionRowValidationError,
	parseOptionModalValues,
} from '../../../src/pages/lesson-type-info/validateLessonTypeOption';

const validOptionForm = {
	duration_minutes: '45',
	frequency: 'weekly' as const,
	price_per_lesson_youth: '20.00',
	price_per_lesson_adult: '25.00',
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

	it('returns an error for invalid youth price', () => {
		expect(
			getOptionModalValidationError({
				...validOptionForm,
				price_per_lesson_youth: 'abc',
			}),
		).toBe('Prijs jongeren moet een positief getal zijn');
	});

	it('returns an error for invalid adult price', () => {
		expect(
			getOptionModalValidationError({
				...validOptionForm,
				price_per_lesson_adult: '-1',
			}),
		).toBe('Prijs volwassenen moet een positief getal zijn');
	});
});

describe('parseOptionModalValues', () => {
	it('parses numeric option modal values', () => {
		expect(parseOptionModalValues(validOptionForm)).toEqual({
			durationMinutes: 45,
			priceYouth: 20,
			priceAdult: 25,
		});
	});
});

describe('getOptionRowValidationError', () => {
	it('returns null for a valid option row', () => {
		expect(
			getOptionRowValidationError(
				{
					duration_minutes: '45',
					price_per_lesson_youth: '20.00',
					price_per_lesson_adult: '25.00',
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
					price_per_lesson_youth: '20.00',
					price_per_lesson_adult: '25.00',
				},
				1,
			),
		).toBe('Optie 2: duur moet een positief getal zijn');
	});

	it('returns a row-specific youth price error', () => {
		expect(
			getOptionRowValidationError(
				{
					duration_minutes: '45',
					price_per_lesson_youth: '0',
					price_per_lesson_adult: '25.00',
				},
				2,
			),
		).toBe('Optie 3: prijs jongeren moet een positief getal zijn');
	});

	it('returns a row-specific adult price error', () => {
		expect(
			getOptionRowValidationError(
				{
					duration_minutes: '45',
					price_per_lesson_youth: '20.00',
					price_per_lesson_adult: '0',
				},
				0,
			),
		).toBe('Optie 1: prijs volwassenen moet een positief getal zijn');
	});
});
