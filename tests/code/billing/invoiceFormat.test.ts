import { describe, expect, it } from 'bun:test';
import {
	ageAtDate,
	bytesToBase64,
	fmtEUR,
	formatVatPercentLabel,
	wrap,
} from '../../../supabase/functions/generate-invoice/format';

describe('ageAtDate', () => {
	it('returns unknown when date of birth is missing', () => {
		expect(ageAtDate(null, '2026-09-01')).toBe('unknown');
	});

	it('returns youth before the age threshold birthday', () => {
		expect(ageAtDate('2010-05-01', '2026-09-01')).toBe('youth');
	});

	it('returns adult on or after the age threshold birthday', () => {
		expect(ageAtDate('2005-09-01', '2026-09-01')).toBe('adult');
		expect(ageAtDate('2005-08-31', '2026-09-01')).toBe('adult');
	});

	it('uses a custom age threshold from settings', () => {
		expect(ageAtDate('2008-09-01', '2026-09-01', 18)).toBe('adult');
		expect(ageAtDate('2008-09-02', '2026-09-01', 18)).toBe('youth');
	});
});

describe('formatVatPercentLabel', () => {
	it('includes the configured standard rate', () => {
		expect(formatVatPercentLabel(21)).toBe('BTW 21%');
		expect(formatVatPercentLabel(9)).toBe('BTW 9%');
	});
});

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
