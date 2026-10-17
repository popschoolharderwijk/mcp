import { describe, expect, it } from 'bun:test';
import { formatYmd, normalizeIsoDate } from './dateHelpers';

describe('formatYmd', () => {
	it('formats a local Date as YYYY-MM-DD with zero-padded month and day', () => {
		expect(formatYmd(new Date(2026, 0, 13, 12, 0, 0))).toBe('2026-01-13');
		expect(formatYmd(new Date(2026, 8, 2, 12, 0, 0))).toBe('2026-09-02');
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
