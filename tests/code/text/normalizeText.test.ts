import { describe, expect, it } from 'bun:test';
import {
	normalizeCompactText,
	normalizeCompactTextOrNull,
	normalizeTrimmedText,
	normalizeTrimmedTextOrNull,
} from '../../../src/lib/text/normalizeText';

describe('normalizeCompactText', () => {
	it('collapses whitespace runs then trims ends including tabs and newlines', () => {
		expect(normalizeCompactText('  Anna   Marie  ')).toBe('Anna Marie');
		expect(normalizeCompactText('\tAnna\nMarie\t')).toBe('Anna Marie');
		expect(normalizeCompactText('\n  Anna  \t')).toBe('Anna');
	});

	it('returns empty string for whitespace-only input', () => {
		expect(normalizeCompactText('   ')).toBe('');
		expect(normalizeCompactText('\t\n')).toBe('');
	});
});

describe('normalizeCompactTextOrNull', () => {
	it('returns null for nullish or blank values', () => {
		expect(normalizeCompactTextOrNull(null)).toBeNull();
		expect(normalizeCompactTextOrNull(undefined)).toBeNull();
		expect(normalizeCompactTextOrNull('   ')).toBeNull();
		expect(normalizeCompactTextOrNull('\t\n')).toBeNull();
	});
});

describe('normalizeTrimmedText', () => {
	it('trims ends without collapsing internal spaces', () => {
		expect(normalizeTrimmedText('  line  one  ')).toBe('line  one');
		expect(normalizeTrimmedText('\tline  one\n')).toBe('line  one');
	});
});

describe('normalizeTrimmedTextOrNull', () => {
	it('returns null for blank values', () => {
		expect(normalizeTrimmedTextOrNull('  ')).toBeNull();
		expect(normalizeTrimmedTextOrNull('\t\n')).toBeNull();
	});
});
