import { describe, expect, it } from 'bun:test';
import { normalizeCompactTextOrNull, normalizeTrimmedTextOrNull } from '../../../src/lib/text/normalizeText';
import { compactOrNull, trimOrNull } from '../../../supabase/functions/_shared/normalizeTextPure';

describe('compactOrNull', () => {
	it('collapses whitespace and nullifies blanks including tabs', () => {
		expect(compactOrNull('  Anna   Marie  ')).toBe('Anna Marie');
		expect(compactOrNull('\tAnna\nMarie\t')).toBe('Anna Marie');
		expect(compactOrNull('   ')).toBeNull();
		expect(compactOrNull(null)).toBeNull();
	});

	it('matches frontend normalizeCompactTextOrNull', () => {
		expect(compactOrNull('  Jan   Piet ')).toBe(normalizeCompactTextOrNull('  Jan   Piet '));
		expect(compactOrNull('\tJan\n')).toBe(normalizeCompactTextOrNull('\tJan\n'));
		expect(compactOrNull('')).toBe(normalizeCompactTextOrNull(''));
	});
});

describe('trimOrNull', () => {
	it('trims without collapsing internal spaces', () => {
		expect(trimOrNull('  line  one  ')).toBe('line  one');
		expect(trimOrNull('\tline  one\n')).toBe('line  one');
		expect(trimOrNull('  ')).toBeNull();
	});

	it('matches frontend normalizeTrimmedTextOrNull', () => {
		expect(trimOrNull('  a  b  ')).toBe(normalizeTrimmedTextOrNull('  a  b  '));
		expect(trimOrNull(undefined)).toBe(normalizeTrimmedTextOrNull(undefined));
	});
});
