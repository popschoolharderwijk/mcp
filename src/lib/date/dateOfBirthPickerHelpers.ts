import { format, isAfter, isBefore, isValid, parse, startOfDay } from 'date-fns';
import { DATE_FORMAT_DB, DATE_FORMAT_UI, formatDateToDb, formatDbDateToUi, now } from '@/lib/date/date-format';

export const DOB_EARLIEST = startOfDay(new Date(1900, 0, 1));

export function formatDbDateOfBirthForInput(value: string | null): string {
	if (!value?.trim()) return '';
	const ui = formatDbDateToUi(value);
	return ui === '-' ? '' : ui;
}

function isDateOfBirthInRange(date: Date, today: Date): boolean {
	const day = startOfDay(date);
	if (isBefore(day, DOB_EARLIEST)) return false;
	if (isAfter(day, startOfDay(today))) return false;
	return true;
}

/**
 * Parse typed Dutch UI date (dd-MM-yyyy) to DB yyyy-MM-dd when valid for date of birth.
 * Returns null for empty/invalid/out-of-range input.
 */
export function parseUiDateOfBirthToDb(ui: string, today: Date = now()): string | null {
	const trimmed = ui.trim();
	if (!trimmed) return null;

	const parsed = parse(trimmed, DATE_FORMAT_UI, today);
	if (!isValid(parsed)) return null;
	if (format(parsed, DATE_FORMAT_UI) !== trimmed) return null;
	if (!isDateOfBirthInRange(parsed, today)) return null;

	return formatDateToDb(parsed);
}

/** True when the visible input text matches the committed DB value (or both empty). */
export function isDateOfBirthDraftSynced(text: string, committedDbValue: string | null, today: Date = now()): boolean {
	const trimmed = text.trim();
	if (!trimmed) return committedDbValue === null || committedDbValue === '';
	return parseUiDateOfBirthToDb(trimmed, today) === committedDbValue;
}

export function parseDbDateOfBirthValue(value: string | null): Date | undefined {
	if (!value) return undefined;
	const parsed = parse(value, DATE_FORMAT_DB, now());
	if (!isValid(parsed)) return undefined;
	return parsed;
}
