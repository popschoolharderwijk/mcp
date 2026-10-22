/** Dutch calendar month labels (1 = Januari … 12 = December). */
export const MONTH_LABELS_NL = [
	'Januari',
	'Februari',
	'Maart',
	'April',
	'Mei',
	'Juni',
	'Juli',
	'Augustus',
	'September',
	'Oktober',
	'November',
	'December',
] as const;

export type CalendarMonth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export function isCalendarMonth(value: number): value is CalendarMonth {
	return Number.isInteger(value) && value >= 1 && value <= 12;
}

export function monthLabelNl(month: number): string {
	if (!isCalendarMonth(month)) return '';
	return MONTH_LABELS_NL[month - 1];
}

/** Last day of month (1–12) in a given calendar year (handles leap February). */
export function lastDayOfMonth(year: number, month: number): number {
	return new Date(year, month, 0).getDate();
}
