import { describe, expect, it } from 'bun:test';
import { escapeXmlChar, fmtAmount, xmlEscape } from '../../../supabase/functions/generate-sepa-xml/xmlHelpers';

describe('escapeXmlChar', () => {
	it('escapes less-than characters', () => {
		expect(escapeXmlChar('<')).toBe('&lt;');
	});

	it('escapes ampersand characters', () => {
		expect(escapeXmlChar('&')).toBe('&amp;');
	});
});

describe('xmlEscape', () => {
	it('escapes XML special characters', () => {
		expect(xmlEscape(`Tom & "Jerry" <3> 'ok'`)).toBe('Tom &amp; &quot;Jerry&quot; &lt;3&gt; &apos;ok&apos;');
	});
});

describe('fmtAmount', () => {
	it('formats cents as a decimal euro amount', () => {
		expect(fmtAmount(1950)).toBe('19.50');
		expect(fmtAmount(0)).toBe('0.00');
	});
});
