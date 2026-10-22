import { describe, expect, it } from 'bun:test';
import {
	assertHasBillingPhases,
	assertPositiveYearlyCents,
	BILLING_MONTHS_PER_YEAR,
	buildBillingComputationFromLoadedData,
	buildPhases,
	calculateYearly,
	clampToSchoolYear,
	getOccurrenceDates,
	getSchoolYearForDateString,
	isTerminalScheduleStatus,
	pickAgeTariff,
	pickPriceCentsForTariff,
	resolveBillingReferenceDate,
	resolveStripeSubscriptionId,
} from '../../../supabase/functions/_shared/billingHelpers';

describe('getSchoolYearForDateString', () => {
	it('places September in the new school year', () => {
		const sy = getSchoolYearForDateString('2026-09-15');
		expect(sy.startYear).toBe(2026);
		expect(sy.start).toBe('2026-09-01');
		expect(sy.end).toBe('2027-07-31');
	});

	it('places March in the previous start year', () => {
		expect(getSchoolYearForDateString('2026-03-10').startYear).toBe(2025);
	});
});

describe('clampToSchoolYear', () => {
	it('narrows to the agreement window', () => {
		const sy = getSchoolYearForDateString('2026-09-15');
		expect(clampToSchoolYear(sy, '2026-10-01', '2027-05-31')).toEqual({
			start: '2026-10-01',
			end: '2027-05-31',
		});
	});

	it('returns null when start is after end', () => {
		const sy = getSchoolYearForDateString('2026-09-15');
		expect(clampToSchoolYear(sy, '2027-08-01', null)).toBeNull();
	});
});

describe('getOccurrenceDates', () => {
	it('aligns weekly occurrences to day of week', () => {
		const dates = getOccurrenceDates(3, '2026-09-01', '2026-09-30', 'weekly');
		expect(dates[0]).toBe('2026-09-02');
		expect(dates).toHaveLength(5);
	});

	it('steps daily and monthly frequencies', () => {
		expect(getOccurrenceDates(1, '2026-09-01', '2026-09-03', 'daily')).toEqual([
			'2026-09-01',
			'2026-09-02',
			'2026-09-03',
		]);
		expect(getOccurrenceDates(1, '2026-09-15', '2026-11-15', 'monthly')).toEqual([
			'2026-09-15',
			'2026-10-15',
			'2026-11-15',
		]);
	});

	it('steps biweekly frequencies', () => {
		expect(getOccurrenceDates(3, '2026-09-01', '2026-09-30', 'biweekly')[0]).toBe('2026-09-02');
	});
});

describe('calculateYearly', () => {
	it('skips August and holiday windows', () => {
		const result = calculateYearly({
			periodStart: '2026-09-01',
			periodEnd: '2027-07-31',
			dayOfWeek: 3,
			frequency: 'weekly',
			pricePerLessonCents: 2000,
			noLessonPeriods: [{ start_date: '2026-12-21', end_date: '2027-01-04' }],
		});
		for (const date of result.lessonDates) {
			expect(date.slice(5, 7)).not.toBe('08');
			expect(date >= '2026-12-21' && date <= '2027-01-04').toBe(false);
		}
		expect(result.yearlyCents).toBe(result.lessonsCount * 2000);
		expect(result.monthlyCents * BILLING_MONTHS_PER_YEAR + result.leftoverCents).toBe(result.yearlyCents);
	});
});

describe('pickAgeTariff', () => {
	it('switches to adult on the 21st birthday', () => {
		expect(pickAgeTariff('2010-06-15', '2026-09-01')).toBe('youth');
		expect(pickAgeTariff('2005-06-15', '2026-09-01')).toBe('adult');
		expect(pickAgeTariff('2005-09-01', '2026-09-01')).toBe('adult');
		expect(pickAgeTariff('2005-09-02', '2026-09-01')).toBe('youth');
		expect(pickAgeTariff(null, '2026-09-01')).toBe('adult');
	});
});

describe('buildPhases', () => {
	it('builds eleven billing months with leftover on the last phase', () => {
		const phases = buildPhases('2026-09-01', '2027-07-31', 1000, 50);
		expect(phases).toHaveLength(11);
		expect(phases[0]?.amountCents).toBe(1000);
		expect(phases[10]?.amountCents).toBe(1050);
		expect(phases.every((phase) => !phase.label.endsWith('-08'))).toBe(true);
	});
});

describe('billing pure helpers', () => {
	it('resolves reference dates, prices, and stripe ids', () => {
		expect(resolveBillingReferenceDate('2026-10-01', '2026-09-01')).toBe('2026-10-01');
		expect(resolveBillingReferenceDate('2026-08-01', '2026-09-01')).toBe('2026-09-01');
		expect(
			pickPriceCentsForTariff(
				{ price_per_lesson_youth_cents: 1900, price_per_lesson_adult_cents: 2400 },
				'youth',
			),
		).toBe(1900);
		expect(
			pickPriceCentsForTariff(
				{ price_per_lesson_youth_cents: 1900, price_per_lesson_adult_cents: 2400 },
				'adult',
			),
		).toBe(2400);
		expect(resolveStripeSubscriptionId('sub_1')).toBe('sub_1');
		expect(resolveStripeSubscriptionId({ id: 'sub_2' })).toBe('sub_2');
		expect(resolveStripeSubscriptionId(null)).toBeNull();
	});

	it('asserts yearly cents and phase counts', () => {
		expect(() => assertPositiveYearlyCents(0)).toThrow('Geen lessen in dit schooljaar');
		expect(() => assertPositiveYearlyCents(100)).not.toThrow();
		expect(() => assertHasBillingPhases(0)).toThrow('Geen incassomaanden');
		expect(() => assertHasBillingPhases(1)).not.toThrow();
	});

	it('detects terminal schedule statuses', () => {
		expect(isTerminalScheduleStatus('canceled')).toBe(true);
		expect(isTerminalScheduleStatus('completed')).toBe(true);
		expect(isTerminalScheduleStatus('released')).toBe(true);
		expect(isTerminalScheduleStatus('active')).toBe(false);
	});
});

describe('buildBillingComputationFromLoadedData', () => {
	const baseAgreement = {
		id: 'agr-1',
		student_user_id: 'stu-1',
		lesson_type_id: 'lt-1',
		frequency: 'weekly' as const,
		duration_minutes: 45,
		day_of_week: 3,
		start_date: '2026-09-01',
		end_date: null,
		is_active: true,
	};

	it('builds a computation for an active agreement', () => {
		const result = buildBillingComputationFromLoadedData({
			agreement: baseAgreement,
			option: { price_per_lesson_youth_cents: 2000, price_per_lesson_adult_cents: 2500 },
			dateOfBirth: '2010-01-01',
			noLessonPeriods: [],
			today: '2026-09-15',
		});
		expect(result.tariff).toBe('youth');
		expect(result.pricePerLessonCents).toBe(2000);
		expect(result.periodStart).toBe('2026-09-01');
		expect(result.yearly.yearlyCents).toBe(result.yearly.lessonsCount * 2000);
		expect(result.yearly.lessonsCount).not.toBe(0);
	});

	it('rejects inactive agreements and missing prices', () => {
		expect(() =>
			buildBillingComputationFromLoadedData({
				agreement: { ...baseAgreement, is_active: false },
				option: { price_per_lesson_youth_cents: 2000, price_per_lesson_adult_cents: 2500 },
				dateOfBirth: null,
				noLessonPeriods: [],
				today: '2026-09-15',
			}),
		).toThrow('niet actief');

		expect(() =>
			buildBillingComputationFromLoadedData({
				agreement: baseAgreement,
				option: { price_per_lesson_youth_cents: null, price_per_lesson_adult_cents: null },
				dateOfBirth: null,
				noLessonPeriods: [],
				today: '2026-09-15',
			}),
		).toThrow('Geen prijs ingesteld');
	});

	it('rejects agreements with no school-year overlap', () => {
		expect(() =>
			buildBillingComputationFromLoadedData({
				agreement: { ...baseAgreement, start_date: '2030-08-01', end_date: '2030-08-15' },
				option: { price_per_lesson_youth_cents: 2000, price_per_lesson_adult_cents: 2500 },
				dateOfBirth: null,
				noLessonPeriods: [],
				today: '2026-09-15',
			}),
		).toThrow('Geen lesperiode');
	});
});
