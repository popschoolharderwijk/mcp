import { describe, expect, it } from 'bun:test';
import { formatYmd } from './dateHelpers';
import { addInterval } from './lessonIntervalHelpers';

describe('addInterval', () => {
	it('advances seven days for weekly', () => {
		const date = new Date(2026, 0, 13, 12, 0, 0);
		addInterval(date, 'weekly');
		expect(formatYmd(date)).toBe('2026-01-20');
	});

	it('advances fourteen days for biweekly', () => {
		const date = new Date(2026, 0, 13, 12, 0, 0);
		addInterval(date, 'biweekly');
		expect(formatYmd(date)).toBe('2026-01-27');
	});

	it('advances one calendar month for monthly', () => {
		const date = new Date(2026, 0, 13, 12, 0, 0);
		addInterval(date, 'monthly');
		expect(formatYmd(date)).toBe('2026-02-13');
	});
});
