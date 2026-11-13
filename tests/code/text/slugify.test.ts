import { describe, expect, it } from 'bun:test';
import { isValidSlug, slugify } from '../../../src/lib/text/slugify';

describe('slugify', () => {
	it('returns an empty string when nothing slug-worthy remains', () => {
		expect(slugify('')).toBe('');
		expect(slugify('---')).toBe('');
	});

	it('strips accents and collapses separators', () => {
		expect(slugify('Café Opname')).toBe('cafe-opname');
		expect(slugify('  Drumlokaal  ')).toBe('drumlokaal');
	});
});

describe('isValidSlug', () => {
	it('accepts lowercase words separated by single hyphens', () => {
		expect(isValidSlug('opnameruimte')).toBe(true);
		expect(isValidSlug('doneer-ruimte')).toBe(true);
	});

	it('rejects empty, uppercase, and leading or trailing hyphens', () => {
		expect(isValidSlug('')).toBe(false);
		expect(isValidSlug('Studio')).toBe(false);
		expect(isValidSlug('-studio')).toBe(false);
		expect(isValidSlug('studio-')).toBe(false);
		expect(isValidSlug('studio--a')).toBe(false);
	});
});
