import { describe, expect, it } from 'bun:test';
import { formatPhoneNumber, hasParentContactInfo } from '../../../src/lib/students/studentInfoHelpers';

describe('formatPhoneNumber', () => {
	it('returns dash for missing phone', () => {
		expect(formatPhoneNumber(null)).toBe('-');
	});

	it('formats ten digit dutch numbers', () => {
		expect(formatPhoneNumber('0612345678')).toBe('06 1234 5678');
	});

	it('returns original value for other lengths', () => {
		expect(formatPhoneNumber('+31612345678')).toBe('+31612345678');
	});
});

describe('hasParentContactInfo', () => {
	it('returns true when parent email exists', () => {
		expect(hasParentContactInfo(null, 'ouder@example.com', null)).toBe(true);
	});

	it('returns false when all parent fields are empty', () => {
		expect(hasParentContactInfo(null, null, null)).toBe(false);
	});
});
