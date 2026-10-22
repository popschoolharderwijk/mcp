import { describe, expect, it } from 'bun:test';
import { pickAgeTariff, pickPriceCents } from '../../../src/lib/billing/ageTariff';
import { calculateYearlyAmount } from '../../../src/lib/billing/calculateYearlyAmount';
import {
	shiftDatePastNoLessonPeriods,
	splitYearlyAmountAcrossBillingMonths,
} from '../../../src/lib/billing/calculateYearlyAmountHelpers';
import {
	clampToSchoolYear,
	getSchoolYearForDateString,
	isNonBillingMonthString,
} from '../../../src/lib/billing/schoolYear';
import { APP_SETTINGS } from '../../rls/seed-data-constants';

const bounds = APP_SETTINGS.SCHOOL_YEAR;
const ageThreshold = APP_SETTINGS.VAT.age_threshold_years;

describe('schoolYear', () => {
	it('places September in the new school year', () => {
		const sy = getSchoolYearForDateString('2026-09-15', bounds);
		expect(sy.startYear).toBe(2026);
		expect(sy.start).toBe('2026-09-01');
		expect(sy.end).toBe('2027-07-31');
	});

	it('places January in the current school year', () => {
		const sy = getSchoolYearForDateString('2027-01-10', bounds);
		expect(sy.startYear).toBe(2026);
	});

	it('places August in the upcoming school year', () => {
		const sy = getSchoolYearForDateString('2026-08-20', bounds);
		expect(sy.startYear).toBe(2026);
	});

	it('isNonBillingMonthString detects August', () => {
		expect(isNonBillingMonthString('2026-08-01', bounds)).toBe(true);
		expect(isNonBillingMonthString('2026-07-31', bounds)).toBe(false);
		expect(isNonBillingMonthString('2026-09-01', bounds)).toBe(false);
	});

	it('clampToSchoolYear clamps to the agreement window', () => {
		const sy = getSchoolYearForDateString('2026-09-15', bounds);
		const clamped = clampToSchoolYear(sy, '2026-10-15', '2027-04-30');
		expect(clamped).toEqual({ start: '2026-10-15', end: '2027-04-30' });
	});

	it('clampToSchoolYear uses school-year bounds when the agreement is wider', () => {
		const sy = getSchoolYearForDateString('2026-09-15', bounds);
		const clamped = clampToSchoolYear(sy, '2020-01-01', null);
		expect(clamped).toEqual({ start: '2026-09-01', end: '2027-07-31' });
	});

	it('clampToSchoolYear returns null when there is no overlap', () => {
		const sy = getSchoolYearForDateString('2026-09-15', bounds);
		expect(clampToSchoolYear(sy, '2030-01-01', '2030-12-31')).toBeNull();
	});
});

describe('pickAgeTariff', () => {
	it('returns youth the day before the 21st birthday', () => {
		expect(pickAgeTariff('2005-09-02', '2026-09-01', ageThreshold)).toBe('youth');
	});
	it('returns adult on the exact 21st birthday', () => {
		expect(pickAgeTariff('2005-09-01', '2026-09-01', ageThreshold)).toBe('adult');
	});
	it('returns adult when DOB is null (safe fallback)', () => {
		expect(pickAgeTariff(null, '2026-09-01', ageThreshold)).toBe('adult');
	});
	it('pickPriceCents selects the matching tariff price', () => {
		const opt = { price_per_lesson_youth_cents: 1950, price_per_lesson_adult_cents: 2360 };
		expect(pickPriceCents(opt, 'youth')).toBe(1950);
		expect(pickPriceCents(opt, 'adult')).toBe(2360);
	});
});

describe('calculateYearlyAmountHelpers', () => {
	it('shifts a lesson past a matching no-lesson period', () => {
		const periods = [{ start_date: '2026-12-21', end_date: '2027-01-04' }];
		const result = shiftDatePastNoLessonPeriods('2026-12-25', '2027-07-31', periods, 0);
		expect(result.lessonDate).toBe('2027-01-09');
		expect(result.shiftDays).toBe(15);
	});

	it('leaves dates outside no-lesson periods unchanged', () => {
		const periods = [{ start_date: '2026-12-21', end_date: '2027-01-04' }];
		const result = shiftDatePastNoLessonPeriods('2026-12-20', '2027-07-31', periods, 0);
		expect(result.lessonDate).toBe('2026-12-20');
		expect(result.shiftDays).toBe(0);
	});

	it('returns null when a shifted lesson falls past the period end', () => {
		const result = shiftDatePastNoLessonPeriods('2027-07-24', '2027-07-31', [], 10);
		expect(result.lessonDate).toBeNull();
		expect(result.shiftDays).toBe(10);
	});

	it('returns null for August lesson dates', () => {
		const result = shiftDatePastNoLessonPeriods('2026-08-03', '2026-08-31', [], 0);
		expect(result.lessonDate).toBeNull();
	});

	it('splits yearly cents across billing months with remainder', () => {
		expect(splitYearlyAmountAcrossBillingMonths(91650, 11)).toEqual({
			monthlyCents: 8331,
			leftoverCents: 9,
		});
	});
});

describe('calculateYearlyAmount', () => {
	it('counts weekly lessons in a full school year excluding August', () => {
		const result = calculateYearlyAmount({
			periodStart: '2026-09-01',
			periodEnd: '2027-07-31',
			dayOfWeek: 1,
			frequency: 'weekly',
			pricePerLessonCents: 1950,
		});
		expect(result.lessonsCount).toBe(47);
		expect(result.yearlyCents).toBe(91650);
		expect(result.monthlyCents).toBe(8331);
		expect(result.leftoverCents).toBe(9);
	});

	it('subtracts no-lesson periods (holidays)', () => {
		const noPeriods = [{ start_date: '2026-12-21', end_date: '2027-01-04' }];
		const withVac = calculateYearlyAmount({
			periodStart: '2026-09-01',
			periodEnd: '2027-07-31',
			dayOfWeek: 1,
			frequency: 'weekly',
			pricePerLessonCents: 1950,
			noLessonPeriods: noPeriods,
		});
		expect(withVac.lessonsCount).toBe(45);
	});

	it('counts biweekly lessons as half of weekly', () => {
		const weekly = calculateYearlyAmount({
			periodStart: '2026-09-01',
			periodEnd: '2027-07-31',
			dayOfWeek: 3,
			frequency: 'weekly',
			pricePerLessonCents: 2000,
		});
		const biweekly = calculateYearlyAmount({
			periodStart: '2026-09-01',
			periodEnd: '2027-07-31',
			dayOfWeek: 3,
			frequency: 'biweekly',
			pricePerLessonCents: 2000,
		});
		expect(weekly.lessonsCount).toBe(48);
		expect(biweekly.lessonsCount).toBe(24);
	});

	it('returns 0 for zero price or an inverted window', () => {
		expect(
			calculateYearlyAmount({
				periodStart: '2026-09-01',
				periodEnd: '2027-07-31',
				dayOfWeek: 1,
				frequency: 'weekly',
				pricePerLessonCents: 0,
			}),
		).toEqual({
			lessonsCount: 0,
			yearlyCents: 0,
			monthlyCents: 0,
			leftoverCents: 0,
			lessonDates: [],
		});
		expect(
			calculateYearlyAmount({
				periodStart: '2027-09-01',
				periodEnd: '2026-07-31',
				dayOfWeek: 1,
				frequency: 'weekly',
				pricePerLessonCents: 1950,
			}),
		).toEqual({
			lessonsCount: 0,
			yearlyCents: 0,
			monthlyCents: 0,
			leftoverCents: 0,
			lessonDates: [],
		});
	});

	it('always excludes August lessons', () => {
		const result = calculateYearlyAmount({
			periodStart: '2026-08-01',
			periodEnd: '2026-08-31',
			dayOfWeek: 1,
			frequency: 'weekly',
			pricePerLessonCents: 1950,
		});
		expect(result.lessonsCount).toBe(0);
	});
});
