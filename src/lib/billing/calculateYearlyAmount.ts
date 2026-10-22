/**
 * Calculate the yearly and monthly amounts for a lesson agreement,
 * based on the number of lessons in a (school) year window, accounting
 * for no-lesson periods and the August break.
 *
 * Pure function, no IO. Reuses existing `getOccurrenceDatesInRange`.
 */

import { getOccurrenceDatesInRange } from '@/lib/lessonHelpers';
import { APP_SETTINGS_BOOTSTRAP } from '@/lib/settings/appSettingsDefaults';
import type { LessonFrequency } from '@/types/lesson-agreements';
import { shiftDatePastNoLessonPeriods, splitYearlyAmountAcrossBillingMonths } from './calculateYearlyAmountHelpers';
import { billingMonthsPerSchoolYear, type SchoolYearBounds } from './schoolYear';

export interface NoLessonPeriod {
	/** YYYY-MM-DD (inclusive). */
	start_date: string;
	/** YYYY-MM-DD (inclusive). */
	end_date: string;
}

export interface CalculateYearlyAmountInput {
	/** YYYY-MM-DD: start of the window (e.g. 1 September or agreement start_date). */
	periodStart: string;
	/** YYYY-MM-DD: end of the window (e.g. 31 July or agreement end_date). */
	periodEnd: string;
	/** 0 = Sunday … 6 = Saturday (matches JS getDay()). */
	dayOfWeek: number;
	frequency: LessonFrequency;
	/** Price per lesson in cents. */
	pricePerLessonCents: number;
	/** No-lesson periods (e.g. school holidays). */
	noLessonPeriods?: ReadonlyArray<NoLessonPeriod>;
	/** Number of billing months over which the yearly amount is spread. Derived from school year when omitted. */
	billingMonths?: number;
	/** School year bounds from app_settings. */
	schoolYearBounds?: SchoolYearBounds;
}

export interface CalculateYearlyAmountResult {
	/** Number of lessons within the window (after excluding no-lesson periods + August). */
	lessonsCount: number;
	/** Yearly amount in cents (= lessonsCount × pricePerLessonCents). */
	yearlyCents: number;
	/** Standard monthly amount in cents (= floor(yearlyCents / billingMonths)). */
	monthlyCents: number;
	/** Remainder in cents (applied to the last billing month). */
	leftoverCents: number;
	/** Actual lesson dates (YYYY-MM-DD), after filtering. */
	lessonDates: string[];
}

export function calculateYearlyAmount(input: CalculateYearlyAmountInput): CalculateYearlyAmountResult {
	const { periodStart, periodEnd, dayOfWeek, frequency, pricePerLessonCents } = input;
	const schoolYearBounds = input.schoolYearBounds ?? APP_SETTINGS_BOOTSTRAP.school_year;
	const billingMonths = input.billingMonths ?? billingMonthsPerSchoolYear(schoolYearBounds);
	const noLessonPeriods = input.noLessonPeriods ?? [];

	if (periodStart > periodEnd || pricePerLessonCents <= 0) {
		return { lessonsCount: 0, yearlyCents: 0, monthlyCents: 0, leftoverCents: 0, lessonDates: [] };
	}

	const start = new Date(`${periodStart}T12:00:00`);
	const end = new Date(`${periodEnd}T12:00:00`);
	const allDates = getOccurrenceDatesInRange(dayOfWeek, start, end, frequency);

	const lessonDates: string[] = [];
	let shiftDays = 0;
	for (const original of allDates) {
		const { lessonDate, shiftDays: nextShiftDays } = shiftDatePastNoLessonPeriods(
			original,
			periodEnd,
			noLessonPeriods,
			shiftDays,
			schoolYearBounds,
		);
		shiftDays = nextShiftDays;
		if (lessonDate) lessonDates.push(lessonDate);
	}

	const lessonsCount = lessonDates.length;
	const yearlyCents = lessonsCount * pricePerLessonCents;
	const { monthlyCents, leftoverCents } = splitYearlyAmountAcrossBillingMonths(yearlyCents, billingMonths);

	return { lessonsCount, yearlyCents, monthlyCents, leftoverCents, lessonDates };
}
