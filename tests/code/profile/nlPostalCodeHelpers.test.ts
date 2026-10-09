import { describe, expect, it } from 'bun:test';
import {
	isValidNlPostalCode,
	normalizeNlPostalCode,
	normalizeNlPostalCodeOrNull,
} from '../../../src/lib/profile/nlPostalCodeHelpers';

describe('normalizeNlPostalCode', () => {
	it('strips spaces and uppercases letters', () => {
		expect(normalizeNlPostalCode('1234 ab')).toBe('1234AB');
		expect(normalizeNlPostalCode('1234  AB')).toBe('1234AB');
		expect(normalizeNlPostalCode('1234ab')).toBe('1234AB');
	});

	it('keeps digits-only postcodes', () => {
		expect(normalizeNlPostalCode('1234')).toBe('1234');
		expect(normalizeNlPostalCode(' 1234 ')).toBe('1234');
	});
});

describe('normalizeNlPostalCodeOrNull', () => {
	it('returns null for blank values', () => {
		expect(normalizeNlPostalCodeOrNull('')).toBeNull();
		expect(normalizeNlPostalCodeOrNull('   ')).toBeNull();
		expect(normalizeNlPostalCodeOrNull(null)).toBeNull();
	});

	it('normalizes non-blank values', () => {
		expect(normalizeNlPostalCodeOrNull('1234 ab')).toBe('1234AB');
	});
});

describe('isValidNlPostalCode', () => {
	it('allows blank postcodes', () => {
		expect(isValidNlPostalCode('')).toBe(true);
		expect(isValidNlPostalCode('   ')).toBe(true);
	});

	it('accepts four digits with optional two letters and spaces', () => {
		expect(isValidNlPostalCode('1234')).toBe(true);
		expect(isValidNlPostalCode('1234AB')).toBe(true);
		expect(isValidNlPostalCode('1234 AB')).toBe(true);
		expect(isValidNlPostalCode('1234ab')).toBe(true);
		expect(isValidNlPostalCode('1234  ab')).toBe(true);
	});

	it('rejects malformed postcodes', () => {
		expect(isValidNlPostalCode('123')).toBe(false);
		expect(isValidNlPostalCode('12345')).toBe(false);
		expect(isValidNlPostalCode('1234A')).toBe(false);
		expect(isValidNlPostalCode('1234ABC')).toBe(false);
		expect(isValidNlPostalCode('ABCD')).toBe(false);
		expect(isValidNlPostalCode('12 3 AB')).toBe(false);
	});

	it('accepts spaces between digits because they are stripped on normalize', () => {
		expect(isValidNlPostalCode('12 34 AB')).toBe(true);
	});
});
