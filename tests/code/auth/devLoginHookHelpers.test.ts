import { describe, expect, it } from 'bun:test';
import { resolveDevLoginCredentials } from '../../../src/lib/auth/devLoginHookHelpers';

describe('resolveDevLoginCredentials', () => {
	it('returns selection error when email is missing', () => {
		expect(resolveDevLoginCredentials(null)).toEqual({
			ok: false,
			error: 'Selecteer eerst een rol, docent, leerling of user',
		});
	});

	it('returns credentials for valid email when password env is set', () => {
		const previous = import.meta.env.VITE_DEV_LOGIN_PASSWORD;
		import.meta.env.VITE_DEV_LOGIN_PASSWORD = 'secret';
		expect(resolveDevLoginCredentials('teacher-alice@test.nl')).toEqual({
			ok: true,
			email: 'teacher-alice@test.nl',
			password: 'secret',
		});
		import.meta.env.VITE_DEV_LOGIN_PASSWORD = previous;
	});

	it('returns error when VITE_DEV_LOGIN_PASSWORD is missing', () => {
		const previous = import.meta.env.VITE_DEV_LOGIN_PASSWORD;
		import.meta.env.VITE_DEV_LOGIN_PASSWORD = '';
		expect(resolveDevLoginCredentials('teacher-alice@test.nl')).toEqual({
			ok: false,
			error: 'VITE_DEV_LOGIN_PASSWORD niet geconfigureerd in environment',
		});
		import.meta.env.VITE_DEV_LOGIN_PASSWORD = previous;
	});
});
