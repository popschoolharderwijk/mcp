import { describe, expect, it } from 'bun:test';
import { bytesToBase64, fmtEUR, wrap } from '../../../supabase/functions/generate-invoice/format';

describe('fmtEUR', () => {
	it('formats cents as a Dutch euro string', () => {
		expect(fmtEUR(2420)).toBe('€ 24,20');
	});
});

describe('wrap', () => {
	it('splits long text into lines within the max width', () => {
		expect(wrap('one two three four five six', 10)).toEqual(['one two', 'three four', 'five six']);
	});

	it('returns a single line when text fits', () => {
		expect(wrap('short text', 50)).toEqual(['short text']);
	});
});

describe('bytesToBase64', () => {
	it('encodes bytes to base64', () => {
		expect(bytesToBase64(new Uint8Array([72, 105]))).toBe('SGk=');
	});
});
