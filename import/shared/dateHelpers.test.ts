import { describe, expect, it } from 'bun:test';
import { formatYmd, normalizeIsoDate, toAmsterdamScheduleSlot, toAmsterdamYmd } from './dateHelpers';

describe('formatYmd', () => {
	it('formats a local Date as YYYY-MM-DD with zero-padded month and day', () => {
		expect(formatYmd(new Date(2026, 0, 13, 12, 0, 0))).toBe('2026-01-13');
		expect(formatYmd(new Date(2026, 8, 2, 12, 0, 0))).toBe('2026-09-02');
	});
});

describe('toAmsterdamYmd', () => {
	it('rolls the calendar date when conversion crosses midnight', () => {
		expect(toAmsterdamYmd(new Date('2026-07-08T22:30:00Z'))).toBe('2026-07-09');
	});
});

describe('toAmsterdamScheduleSlot', () => {
	it('applies CET (UTC+1) in winter', () => {
		expect(toAmsterdamScheduleSlot(new Date('2026-02-24T19:35:52Z'))).toEqual({
			dayOfWeek: 2,
			startTime: '20:35:52',
		});
	});

	it('applies CEST (UTC+2) in summer', () => {
		expect(toAmsterdamScheduleSlot(new Date('2026-07-08T18:00:00Z'))).toEqual({
			dayOfWeek: 3,
			startTime: '20:00:00',
		});
	});

	it('rolls the weekday when conversion crosses midnight', () => {
		expect(toAmsterdamScheduleSlot(new Date('2026-07-08T22:30:00Z'))).toEqual({
			dayOfWeek: 4,
			startTime: '00:30:00',
		});
	});
});

describe('normalizeIsoDate', () => {
	it('returns null for empty input', () => {
		expect(normalizeIsoDate(null)).toBeNull();
		expect(normalizeIsoDate('')).toBeNull();
		expect(normalizeIsoDate('   ')).toBeNull();
	});

	it('keeps a valid YYYY-MM-DD date', () => {
		expect(normalizeIsoDate('2023-12-06')).toBe('2023-12-06');
	});

	it('rejects invalid calendar dates and formats', () => {
		expect(normalizeIsoDate('2023-13-01')).toBeNull();
		expect(normalizeIsoDate('2023-02-30')).toBeNull();
		expect(normalizeIsoDate('06-12-2023')).toBeNull();
		expect(normalizeIsoDate('not-a-date')).toBeNull();
	});
});
