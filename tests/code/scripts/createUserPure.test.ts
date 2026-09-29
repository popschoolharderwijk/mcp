import { describe, expect, it } from 'bun:test';
import { parseCreateUsersFromEnv } from '../../../scripts/createUserPure';

describe('parseCreateUsersFromEnv', () => {
	it('parses a single user', () => {
		expect(
			parseCreateUsersFromEnv({
				email: 'jordi@mplifi.nl',
				firstName: 'Jordi',
				lastName: 'van Putten',
				role: 'site_admin',
			}),
		).toEqual([
			{
				email: 'jordi@mplifi.nl',
				firstName: 'Jordi',
				lastName: 'van Putten',
				role: 'site_admin',
			},
		]);
	});

	it('parses multiple comma-separated users and trims whitespace', () => {
		expect(
			parseCreateUsersFromEnv({
				email: 'a@example.com, b@example.com',
				firstName: 'Ada, Bob',
				lastName: 'Lovelace, Builder',
				role: 'site_admin, admin',
			}),
		).toEqual([
			{ email: 'a@example.com', firstName: 'Ada', lastName: 'Lovelace', role: 'site_admin' },
			{ email: 'b@example.com', firstName: 'Bob', lastName: 'Builder', role: 'admin' },
		]);
	});

	it('throws when DEV_LOGIN_EMAIL is missing', () => {
		expect(() => parseCreateUsersFromEnv({ firstName: 'Ada', lastName: 'Lovelace', role: 'admin' })).toThrow(
			'Missing DEV_LOGIN_EMAIL in environment',
		);
	});

	it('throws when email, first name, last name and role counts differ', () => {
		expect(() =>
			parseCreateUsersFromEnv({
				email: 'a@example.com,b@example.com',
				firstName: 'Ada,Bob',
				lastName: 'Lovelace,Builder',
				role: 'site_admin',
			}),
		).toThrow(
			'DEV_LOGIN_EMAIL, DEV_LOGIN_FIRST_NAME, DEV_LOGIN_LAST_NAME and DEV_LOGIN_ROLE must have the same number of comma-separated values (got emails=2, firstNames=2, lastNames=2, roles=1)',
		);
	});

	it('throws when an email entry is empty', () => {
		expect(() =>
			parseCreateUsersFromEnv({
				email: 'a@example.com,',
				firstName: 'Ada,Bob',
				lastName: 'Lovelace,Builder',
				role: 'site_admin,admin',
			}),
		).toThrow('DEV_LOGIN_EMAIL entry at index 1 is empty');
	});
});
