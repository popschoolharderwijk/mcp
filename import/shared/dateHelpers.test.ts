import { describe, expect, it } from 'bun:test';
import { normalizeIsoDate } from './dateHelpers';

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
