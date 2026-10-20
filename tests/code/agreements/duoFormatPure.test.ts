import { describe, expect, it } from 'bun:test';
import { formatDate, formatMonthlyAmount } from '../../../supabase/functions/create-duo-agreements/formatPure';

describe('formatMonthlyAmount', () => {
	it('formats the monthly duo amount', () => {
		expect(formatMonthlyAmount(5156).replace(/\s/g, ' ')).toBe('€ 51,56 per maand');
		expect(formatMonthlyAmount(null)).toBe('volgens de tarievenlijst');
	});
});

describe('formatDate', () => {
	it('converts ISO dates to dd-mm-yyyy', () => {
		expect(formatDate('2026-09-01')).toBe('01-09-2026');
	});

	it('returns the original string for non-ISO input', () => {
		expect(formatDate('01-09-2026')).toBe('01-09-2026');
	});
});
