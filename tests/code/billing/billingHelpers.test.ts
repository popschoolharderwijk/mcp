import { describe, expect, it } from 'bun:test';
import {
	assembleBillingContextFromLoadedRows,
	assertHasBillingPhases,
	assertPositiveYearlyCents,
	buildBillingComputationFromLoadedData,
	buildLessonPhasePriceIdempotencyKey,
	buildLessonPhasePriceRecoveryIdempotencyKey,
	buildLessonProductIdempotencyKey,
	buildLessonProductRecoveryIdempotencyKey,
	buildLessonTypeOptionProductSearchQuery,
	buildPhases,
	buildSetupScheduleIdempotencyKey,
	buildStripeTuitionProductName,
	calculateYearly,
	clampToSchoolYear,
	getOccurrenceDates,
	getSchoolYearForDateString,
	isTerminalScheduleStatus,
	pickAgeTariff,
	pickPriceCentsForTariff,
	pickSharedRecurringMonthlyPriceId,
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
	it('builds eleven billing months with a flat monthly amount', () => {
		const phases = buildPhases('2026-09-01', '2027-07-31', 1000);
		expect(phases).toHaveLength(11);
		expect(phases.map((phase) => phase.amountCents)).toEqual([
			1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000,
		]);
		expect(phases.map((phase) => phase.label)).toEqual([
			'2026-09',
			'2026-10',
			'2026-11',
			'2026-12',
			'2027-01',
			'2027-02',
			'2027-03',
			'2027-04',
			'2027-05',
			'2027-06',
			'2027-07',
		]);
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
		expect(() => assertHasBillingPhases(0)).toThrow('Geen betaalmaanden');
		expect(() => assertHasBillingPhases(1)).not.toThrow();
	});

	it('detects terminal schedule statuses', () => {
		expect(isTerminalScheduleStatus('canceled')).toBe(true);
		expect(isTerminalScheduleStatus('completed')).toBe(true);
		expect(isTerminalScheduleStatus('released')).toBe(true);
		expect(isTerminalScheduleStatus('active')).toBe(false);
	});

	it('builds setup schedule and shared catalog idempotency keys', () => {
		const agreementId = 'b71a9af2-a151-4d42-adf2-3dae0db53ff0';
		const attemptId = 'seti_1UaCGS8GrwT7wj0BChaoxfVI';
		const optionId = 'opt-gitaar-30-weekly';
		expect(buildSetupScheduleIdempotencyKey(agreementId, attemptId)).toBe(
			`mcp_setup_schedule_${agreementId}_${attemptId}`,
		);
		expect(buildLessonProductIdempotencyKey(optionId)).toBe(`mcp_lesson_product_${optionId}`);
		expect(buildLessonProductRecoveryIdempotencyKey(optionId, 'nonce-1')).toBe(
			`mcp_lesson_product_${optionId}_recreate_nonce-1`,
		);
		expect(buildLessonPhasePriceIdempotencyKey(optionId, 7338)).toBe(`mcp_lesson_price_${optionId}_7338`);
		expect(buildLessonPhasePriceRecoveryIdempotencyKey(optionId, 7338, 'nonce-2')).toBe(
			`mcp_lesson_price_${optionId}_7338_recreate_nonce-2`,
		);
		expect(buildLessonTypeOptionProductSearchQuery(optionId)).toBe(
			`metadata['lesson_type_option_id']:'${optionId}'`,
		);
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

describe('assembleBillingContextFromLoadedRows', () => {
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

	it('maps option id and trims lesson type name from loaded rows', () => {
		const result = assembleBillingContextFromLoadedRows({
			agreement: baseAgreement,
			option: {
				id: 'opt-1',
				price_per_lesson_youth_cents: 2000,
				price_per_lesson_adult_cents: 2500,
			},
			student: { date_of_birth: '2010-01-01' },
			noLessonPeriods: null,
			lessonType: { name: '  Piano  ' },
			today: '2026-09-15',
		});
		expect(result.lessonTypeOptionId).toBe('opt-1');
		expect(result.lessonTypeName).toBe('Piano');
		expect(result.billing.tariff).toBe('youth');
		expect(result.billing.pricePerLessonCents).toBe(2000);
	});

	it('treats missing student and blank lesson type as nulls', () => {
		const result = assembleBillingContextFromLoadedRows({
			agreement: baseAgreement,
			option: {
				id: 'opt-2',
				price_per_lesson_youth_cents: 2000,
				price_per_lesson_adult_cents: 2500,
			},
			student: undefined,
			noLessonPeriods: undefined,
			lessonType: { name: '   ' },
			today: '2026-09-15',
		});
		expect(result.lessonTypeOptionId).toBe('opt-2');
		expect(result.lessonTypeName).toBeNull();
		expect(result.billing.tariff).toBe('adult');
	});
});

describe('buildStripeTuitionProductName', () => {
	it('builds a shared option product title without student names', () => {
		expect(
			buildStripeTuitionProductName({
				lessonTypeName: 'Gitaarles',
				durationMinutes: 30,
				frequency: 'weekly',
			}),
		).toBe('Lesgeld · Gitaarles · 30 min · wekelijks');
	});
});

describe('pickSharedRecurringMonthlyPriceId', () => {
	it('reuses an active monthly price with the same unit amount', () => {
		expect(
			pickSharedRecurringMonthlyPriceId(
				[
					{
						id: 'price_old',
						active: true,
						unit_amount: 7000,
						recurring: { interval: 'month', interval_count: 1 },
					},
					{
						id: 'price_match',
						active: true,
						unit_amount: 7338,
						recurring: { interval: 'month', interval_count: 1 },
					},
				],
				7338,
			),
		).toBe('price_match');
	});

	it('ignores inactive or non-monthly prices', () => {
		expect(
			pickSharedRecurringMonthlyPriceId(
				[
					{
						id: 'price_inactive',
						active: false,
						unit_amount: 7338,
						recurring: { interval: 'month', interval_count: 1 },
					},
					{
						id: 'price_yearly',
						active: true,
						unit_amount: 7338,
						recurring: { interval: 'year', interval_count: 1 },
					},
				],
				7338,
			),
		).toBeNull();
	});
});
