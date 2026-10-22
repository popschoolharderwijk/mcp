import { describe, expect, it } from 'bun:test';
import { formatDate, formatPrice } from '../../../supabase/functions/create-duo-agreements/formatHelpers';

describe('formatPrice', () => {
	it('formats euro amounts for nl-NL', () => {
		expect(formatPrice(25)).toBe('€ 25,00');
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
