import { describe, expect, it } from 'bun:test';
import {
	formatDbDateOfBirthForInput,
	isDateOfBirthDraftSynced,
	parseUiDateOfBirthToDb,
} from '../../../src/lib/date/dateOfBirthPickerHelpers';

describe('formatDbDateOfBirthForInput', () => {
	it('formats a DB date for the input field', () => {
		expect(formatDbDateOfBirthForInput('2010-02-14')).toBe('14-02-2010');
	});

	it('returns empty string for null or invalid values', () => {
		expect(formatDbDateOfBirthForInput(null)).toBe('');
		expect(formatDbDateOfBirthForInput('not-a-date')).toBe('');
	});
});

describe('parseUiDateOfBirthToDb', () => {
	const today = new Date(2026, 9, 6);

	it('parses a valid Dutch date of birth', () => {
		expect(parseUiDateOfBirthToDb('14-02-2010', today)).toBe('2010-02-14');
	});

	it('returns null for empty input', () => {
		expect(parseUiDateOfBirthToDb('  ', today)).toBeNull();
	});

	it('returns null for impossible calendar dates', () => {
		expect(parseUiDateOfBirthToDb('31-02-2010', today)).toBeNull();
	});

	it('returns null for future dates', () => {
		expect(parseUiDateOfBirthToDb('07-10-2026', today)).toBeNull();
	});

	it('accepts today as a valid date of birth', () => {
		expect(parseUiDateOfBirthToDb('06-10-2026', today)).toBe('2026-10-06');
	});

	it('accepts 01-01-1900 as the earliest date of birth', () => {
		expect(parseUiDateOfBirthToDb('01-01-1900', today)).toBe('1900-01-01');
	});

	it('returns null for dates before 1900', () => {
		expect(parseUiDateOfBirthToDb('31-12-1899', today)).toBeNull();
	});
});

describe('isDateOfBirthDraftSynced', () => {
	const today = new Date(2026, 9, 6);

	it('treats matching typed and committed values as synced', () => {
		expect(isDateOfBirthDraftSynced('14-02-2010', '2010-02-14', today)).toBe(true);
	});

	it('treats incomplete typed text as unsynced', () => {
		expect(isDateOfBirthDraftSynced('14-02-201', '2010-02-14', today)).toBe(false);
	});

	it('keeps invalid text unsynced so blur-before-save still blocks', () => {
		expect(isDateOfBirthDraftSynced('abc', '2010-02-14', today)).toBe(false);
	});
});
