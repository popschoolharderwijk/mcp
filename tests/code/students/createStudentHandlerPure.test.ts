import { describe, expect, it } from 'bun:test';
import {
	resolveCreateStudentAuthError,
	resolveCreateStudentPersistFailure,
	resolveCreateStudentValidationFailure,
} from '../../../supabase/functions/create-student/createStudentHandlerPure';

describe('resolveCreateStudentAuthError', () => {
	it('maps duplicate email errors to 409', () => {
		expect(resolveCreateStudentAuthError('User already registered')).toEqual({
			status: 409,
			error: 'Een gebruiker met dit e-mailadres bestaat al.',
		});
	});

	it('maps other auth errors to 400', () => {
		expect(resolveCreateStudentAuthError('invalid email')).toEqual({
			status: 400,
			error: 'invalid email',
		});
	});
});

describe('resolveCreateStudentValidationFailure', () => {
	it('returns null when validation passes', () => {
		expect(resolveCreateStudentValidationFailure(null)).toBeNull();
	});

	it('returns 400 when validation fails', () => {
		expect(resolveCreateStudentValidationFailure('Email is verplicht')).toEqual({
			status: 400,
			error: 'Email is verplicht',
		});
	});
});

describe('resolveCreateStudentPersistFailure', () => {
	it('returns null when the write succeeds', () => {
		expect(resolveCreateStudentPersistFailure(null, 'Kon profiel niet bijwerken')).toBeNull();
	});

	it('returns 500 with the step-specific message', () => {
		expect(resolveCreateStudentPersistFailure({ message: 'db error' }, 'Kon leerlingrecord niet aanmaken')).toEqual(
			{
				status: 500,
				error: 'Kon leerlingrecord niet aanmaken',
			},
		);
	});
});
