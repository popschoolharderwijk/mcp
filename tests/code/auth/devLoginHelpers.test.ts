import { describe, expect, it } from 'bun:test';
import {
	getDevLoginErrorMessage,
	resolveDevLoginEmail,
	resolveStoredDevLoginValue,
} from '../../../src/lib/auth/devLoginHelpers';

describe('resolveStoredDevLoginValue', () => {
	it('returns stored dev user email', () => {
		expect(resolveStoredDevLoginValue('teacher-alice@test.nl')).toBe('teacher-alice@test.nl');
	});

	it('returns default site admin when stored value is missing', () => {
		expect(resolveStoredDevLoginValue(null)).toBe('site-admin@test.nl');
	});

	it('returns default site admin when stored value is unknown', () => {
		expect(resolveStoredDevLoginValue('site_admin')).toBe('site-admin@test.nl');
	});
});

describe('resolveDevLoginEmail', () => {
	it('returns direct dev user email', () => {
		expect(resolveDevLoginEmail('teacher-alice@test.nl')).toBe('teacher-alice@test.nl');
	});

	it('returns null for unknown value', () => {
		expect(resolveDevLoginEmail('unknown')).toBeNull();
	});

	it('returns null for old role keys', () => {
		expect(resolveDevLoginEmail('site_admin')).toBeNull();
	});
});

describe('getDevLoginErrorMessage', () => {
	it('returns helpful invalid credentials message', () => {
		expect(getDevLoginErrorMessage('Invalid login credentials', 'teacher-alice@test.nl')).toContain(
			'teacher-alice@test.nl',
		);
	});
});
