import { describe, expect, it } from 'bun:test';
import {
	DATE_PICKER_EARLIEST,
	formatDbDateForInput,
	isDatePickerDraftSynced,
	parseUiDateToDb,
} from '../../../src/lib/date/datePickerHelpers';

const pastOnlyRange = {
	minDate: DATE_PICKER_EARLIEST,
	maxDate: new Date(2026, 9, 6),
};

describe('formatDbDateForInput', () => {
	it('formats a DB date for the input field', () => {
		expect(formatDbDateForInput('2010-02-14')).toBe('14-02-2010');
	});

	it('returns empty string for null or invalid values', () => {
		expect(formatDbDateForInput(null)).toBe('');
		expect(formatDbDateForInput('not-a-date')).toBe('');
	});
});

describe('parseUiDateToDb', () => {
	const today = new Date(2026, 9, 6);

	it('parses a valid Dutch date within range', () => {
		expect(parseUiDateToDb('14-02-2010', pastOnlyRange, today)).toBe('2010-02-14');
	});

	it('returns null for empty input', () => {
		expect(parseUiDateToDb('  ', pastOnlyRange, today)).toBeNull();
	});

	it('returns null for impossible calendar dates', () => {
		expect(parseUiDateToDb('31-02-2010', pastOnlyRange, today)).toBeNull();
	});

	it('returns null for dates after maxDate', () => {
		expect(parseUiDateToDb('07-10-2026', pastOnlyRange, today)).toBeNull();
	});

	it('accepts maxDate as a valid date', () => {
		expect(parseUiDateToDb('06-10-2026', pastOnlyRange, today)).toBe('2026-10-06');
	});

	it('accepts minDate as a valid date', () => {
		expect(parseUiDateToDb('01-01-1900', pastOnlyRange, today)).toBe('1900-01-01');
	});

	it('returns null for dates before minDate', () => {
		expect(parseUiDateToDb('31-12-1899', pastOnlyRange, today)).toBeNull();
	});
});

describe('isDatePickerDraftSynced', () => {
	const today = new Date(2026, 9, 6);

	it('treats matching typed and committed values as synced', () => {
		expect(isDatePickerDraftSynced('14-02-2010', '2010-02-14', pastOnlyRange, today)).toBe(true);
	});

	it('treats incomplete typed text as unsynced', () => {
		expect(isDatePickerDraftSynced('14-02-201', '2010-02-14', pastOnlyRange, today)).toBe(false);
	});

	it('keeps invalid text unsynced so blur-before-save still blocks', () => {
		expect(isDatePickerDraftSynced('abc', '2010-02-14', pastOnlyRange, today)).toBe(false);
	});
});
