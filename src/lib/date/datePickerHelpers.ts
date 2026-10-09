import { format, isAfter, isBefore, isValid, parse, startOfDay } from 'date-fns';
import { DATE_FORMAT_DB, DATE_FORMAT_UI, formatDateToDb, formatDbDateToUi, now } from '@/lib/date/date-format';

/** Earliest selectable day for past-oriented pickers (DOB, CoC issue date, …). */
export const DATE_PICKER_EARLIEST = startOfDay(new Date(1900, 0, 1));

export type DatePickerRange = {
	minDate?: Date;
	maxDate?: Date;
};

/** Inclusive range from 1900-01-01 through today (local). */
export function pastDatePickerRange(referenceDate: Date = now()): DatePickerRange {
	return { minDate: DATE_PICKER_EARLIEST, maxDate: startOfDay(referenceDate) };
}

export function formatDbDateForInput(value: string | null): string {
	if (!value?.trim()) return '';
	const ui = formatDbDateToUi(value);
	return ui === '-' ? '' : ui;
}

function isDateInPickerRange(date: Date, range: DatePickerRange): boolean {
	const day = startOfDay(date);
	if (range.minDate && isBefore(day, startOfDay(range.minDate))) return false;
	if (range.maxDate && isAfter(day, startOfDay(range.maxDate))) return false;
	return true;
}

/**
 * Parse typed Dutch UI date (dd-MM-yyyy) to DB yyyy-MM-dd when valid and in range.
 * Returns null for empty/invalid/out-of-range input.
 */
export function parseUiDateToDb(ui: string, range: DatePickerRange = {}, referenceDate: Date = now()): string | null {
	const trimmed = ui.trim();
	if (!trimmed) return null;

	const parsed = parse(trimmed, DATE_FORMAT_UI, referenceDate);
	if (!isValid(parsed)) return null;
	if (format(parsed, DATE_FORMAT_UI) !== trimmed) return null;
	if (!isDateInPickerRange(parsed, range)) return null;

	return formatDateToDb(parsed);
}

/** True when the visible input text matches the committed DB value (or both empty). */
export function isDatePickerDraftSynced(
	text: string,
	committedDbValue: string | null,
	range: DatePickerRange = {},
	referenceDate: Date = now(),
): boolean {
	const trimmed = text.trim();
	if (!trimmed) return committedDbValue === null || committedDbValue === '';
	return parseUiDateToDb(trimmed, range, referenceDate) === committedDbValue;
}

export function parseDbDateValue(value: string | null): Date | undefined {
	if (!value) return undefined;
	const parsed = parse(value, DATE_FORMAT_DB, now());
	if (!isValid(parsed)) return undefined;
	return parsed;
}
