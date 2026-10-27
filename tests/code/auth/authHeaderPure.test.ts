import { describe, expect, it } from 'bun:test';
import { bearerTokenFromHeader } from '../../../supabase/functions/_shared/authHeaderPure';

describe('bearerTokenFromHeader', () => {
	it('returns the token from a Bearer header', () => {
		expect(bearerTokenFromHeader('Bearer abc.def.ghi')).toBe('abc.def.ghi');
	});
	it('is case-insensitive and trims whitespace', () => {
		expect(bearerTokenFromHeader('bearer   abc  ')).toBe('abc');
	});
	it('returns undefined for missing or empty headers', () => {
		expect(bearerTokenFromHeader(null)).toBeUndefined();
		expect(bearerTokenFromHeader('')).toBeUndefined();
		expect(bearerTokenFromHeader('Bearer ')).toBeUndefined();
	});
});
