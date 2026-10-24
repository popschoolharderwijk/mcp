import { describe, expect, it } from 'bun:test';
import { tipAutoIntervalRemainingMs } from '../../../src/lib/tips/tipAutoIntervalHelpers';

describe('tipAutoIntervalRemainingMs', () => {
	it('returns 0 when never shown, elapsed, or interval is zero', () => {
		expect(tipAutoIntervalRemainingMs(null, 1_000_000, 10)).toBe(0);
		expect(tipAutoIntervalRemainingMs(1_000_000, 1_000_000 + 600_000, 10)).toBe(0);
		expect(tipAutoIntervalRemainingMs(1_000_000, 1_000_001, 0)).toBe(0);
	});

	it('returns remaining ms while inside the interval', () => {
		expect(tipAutoIntervalRemainingMs(1_000_000, 1_000_000 + 100_000, 10)).toBe(500_000);
		expect(tipAutoIntervalRemainingMs(1_000_000, 1_000_000 + 599_999, 10)).toBe(1);
	});
});
