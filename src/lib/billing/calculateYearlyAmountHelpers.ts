import { addDaysToDateStr } from '@/lib/date/date-format';
import { APP_SETTINGS_BOOTSTRAP } from '@/lib/settings/appSettingsDefaults';
import type { NoLessonPeriod } from './calculateYearlyAmount';
import { isNonBillingMonthString, type SchoolYearBounds } from './schoolYear';

function findNoLessonPeriod(dateStr: string, periods: ReadonlyArray<NoLessonPeriod>): NoLessonPeriod | undefined {
	for (const p of periods) {
		if (dateStr >= p.start_date && dateStr <= p.end_date) return p;
	}
	return undefined;
}

function periodLengthDays(p: NoLessonPeriod): number {
	const start = Date.parse(`${p.start_date}T12:00:00`);
	const end = Date.parse(`${p.end_date}T12:00:00`);
	return Math.round((end - start) / 86_400_000) + 1;
}

export function shiftDatePastNoLessonPeriods(
	originalDate: string,
	periodEnd: string,
	noLessonPeriods: ReadonlyArray<NoLessonPeriod>,
	initialShiftDays: number,
	schoolYearBounds: SchoolYearBounds = APP_SETTINGS_BOOTSTRAP.school_year,
): { lessonDate: string | null; shiftDays: number } {
	let shiftDays = initialShiftDays;
	let actual = shiftDays > 0 ? addDaysToDateStr(originalDate, shiftDays) : originalDate;
	while (true) {
		const period = findNoLessonPeriod(actual, noLessonPeriods);
		if (!period) break;
		const len = periodLengthDays(period);
		shiftDays += len;
		actual = addDaysToDateStr(actual, len);
	}
	if (actual > periodEnd) return { lessonDate: null, shiftDays };
	if (isNonBillingMonthString(actual, schoolYearBounds)) return { lessonDate: null, shiftDays };
	return { lessonDate: actual, shiftDays };
}

export function splitYearlyAmountAcrossBillingMonths(
	yearlyCents: number,
	billingMonths: number,
): { monthlyCents: number; leftoverCents: number } {
	const monthlyCents = billingMonths > 0 ? Math.floor(yearlyCents / billingMonths) : 0;
	const leftoverCents = yearlyCents - monthlyCents * billingMonths;
	return { monthlyCents, leftoverCents };
}
