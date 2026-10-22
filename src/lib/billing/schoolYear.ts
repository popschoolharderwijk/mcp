/**
 * School year helpers for lesson fee billing and agreement defaults.
 * Bounds come from app_settings.school_year (full months: 1st … last day).
 */

import { lastDayOfMonth, monthLabelNl } from '@/lib/date/month-labels';
import type { SchoolYearSetting } from '@/lib/settings/appSettingsTypes';

export type SchoolYearBounds = SchoolYearSetting;

export interface SchoolYearWindow {
	/** YYYY-MM-DD inclusive start (1st of start_month). */
	start: string;
	/** YYYY-MM-DD inclusive end (last day of end_month). */
	end: string;
	/** Calendar year of the school-year start. */
	startYear: number;
}

function pad(n: number): string {
	return n.toString().padStart(2, '0');
}

function monthDayOrdinal(month: number, day: number): number {
	return month * 100 + day;
}

function startDay(): number {
	return 1;
}

function endDay(year: number, endMonth: number): number {
	return lastDayOfMonth(year, endMonth);
}

/**
 * Determine the school year a date falls in, using configured start/end months.
 * Dates in the gap between end and next start belong to the upcoming school year
 * (same idea as August belonging to the Sep–Jul year).
 */
function getSchoolYearForDate(date: Date, bounds: SchoolYearBounds): SchoolYearWindow {
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();
	const asOf = monthDayOrdinal(month, day);
	const startOrd = monthDayOrdinal(bounds.start_month, startDay());
	// Compare against end of end_month using a non-leap reference year for ordinal only.
	const endOrd = monthDayOrdinal(bounds.end_month, endDay(2024, bounds.end_month));

	let startYear: number;
	if (startOrd <= endOrd) {
		startYear = asOf >= startOrd && asOf <= endOrd ? year : asOf > endOrd ? year : year - 1;
	} else if (asOf >= startOrd) {
		startYear = year;
	} else if (asOf <= endOrd) {
		startYear = year - 1;
	} else {
		startYear = year;
	}

	const endYear = startOrd <= endOrd ? startYear : startYear + 1;
	return {
		startYear,
		start: `${startYear}-${pad(bounds.start_month)}-${pad(startDay())}`,
		end: `${endYear}-${pad(bounds.end_month)}-${pad(endDay(endYear, bounds.end_month))}`,
	};
}

/** School year a YYYY-MM-DD string falls in. */
export function getSchoolYearForDateString(dateStr: string, bounds: SchoolYearBounds): SchoolYearWindow {
	return getSchoolYearForDate(new Date(`${dateStr}T12:00:00`), bounds);
}

/**
 * Effective billing window within a given school year,
 * bounded by the agreement (start_date / end_date).
 *
 * @returns null if the agreement has no overlap with the school year.
 */
export function clampToSchoolYear(
	schoolYear: SchoolYearWindow,
	agreementStartDate: string,
	agreementEndDate: string | null,
): { start: string; end: string } | null {
	const start = agreementStartDate > schoolYear.start ? agreementStartDate : schoolYear.start;
	const end = agreementEndDate && agreementEndDate < schoolYear.end ? agreementEndDate : schoolYear.end;
	if (start > end) return null;
	return { start, end };
}

/** True if YYYY-MM-DD falls outside the school-year lesson window (non-billing gap). */
export function isNonBillingMonthString(dateStr: string, bounds: SchoolYearBounds): boolean {
	const window = getSchoolYearForDateString(dateStr, bounds);
	return dateStr < window.start || dateStr > window.end;
}

/**
 * Number of distinct calendar months that overlap the school-year window
 * (used to spread yearly fees). For Sep–Jul this is 11.
 */
export function billingMonthsPerSchoolYear(bounds: SchoolYearBounds): number {
	const sample = getSchoolYearForDate(new Date(`${new Date().getFullYear()}-10-15T12:00:00`), bounds);
	const start = new Date(`${sample.start}T12:00:00`);
	const end = new Date(`${sample.end}T12:00:00`);
	return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
}

/** Default agreement/group end date: end of the school year that `asOf` belongs to. */
export function resolveDefaultAgreementEndDate(asOf: Date, bounds: SchoolYearBounds): string {
	return getSchoolYearForDate(asOf, bounds).end;
}

/**
 * Dutch summary of configured full-month school-year bounds (1st … last day).
 * February uses a non-leap reference year so the label stays stable in settings UI.
 */
export function describeSchoolYearBounds(bounds: SchoolYearBounds): string {
	const startName = monthLabelNl(bounds.start_month).toLowerCase();
	const endName = monthLabelNl(bounds.end_month).toLowerCase();
	const endDayNum = lastDayOfMonth(2025, bounds.end_month);
	return `Dit schooljaar loopt van 1 ${startName} t/m ${endDayNum} ${endName}.`;
}
