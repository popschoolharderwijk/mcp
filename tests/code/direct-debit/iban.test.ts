import { describe, expect, it } from 'bun:test';
import { formatIban, isValidIban, normalizeIban } from '../../../src/lib/direct-debit/iban';

describe('normalizeIban', () => {
	it('strips spaces and uppercases the input', () => {
		expect(normalizeIban('nl91 abna 0417 1643 00')).toBe('NL91ABNA0417164300');
	});
});

describe('formatIban', () => {
	it('groups characters in blocks of four', () => {
		expect(formatIban('NL91ABNA0417164300')).toBe('NL91 ABNA 0417 1643 00');
	});
});

describe('isValidIban', () => {
	it('accepts a valid Dutch IBAN', () => {
		expect(isValidIban('NL91 ABNA 0417 1643 00')).toBe(true);
	});

	it('rejects an invalid checksum', () => {
		expect(isValidIban('NL00ABNA0417164300')).toBe(false);
	});

	it('rejects an invalid country and length format', () => {
		expect(isValidIban('INVALID')).toBe(false);
		expect(isValidIban('NL123')).toBe(false);
	});
});
