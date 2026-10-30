import { describe, expect, it } from 'bun:test';
import { isValidIban, normalizeIban } from '../../../supabase/functions/_shared/ibanHelpers';

describe('ibanHelpers', () => {
	it('normalizes spacing and case', () => {
		expect(normalizeIban(' nl12 abna 0123 4567 89 ')).toBe('NL12ABNA0123456789');
	});

	it('accepts a valid Dutch IBAN checksum', () => {
		expect(isValidIban('NL91ABNA0417164300')).toBe(true);
	});

	it('rejects invalid structure', () => {
		expect(isValidIban('NL91ABNA041716430')).toBe(false);
	});

	it('rejects invalid checksum', () => {
		expect(isValidIban('NL91ABNA0417164301')).toBe(false);
	});
});
