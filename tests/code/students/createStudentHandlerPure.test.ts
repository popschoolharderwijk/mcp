import { describe, expect, it } from 'bun:test';
import {
	readCreateStudentStepFailure,
	resolveCreateStudentAuthError,
	resolveCreateStudentPersistFailure,
	resolveCreateStudentRequestOutcome,
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

describe('resolveCreateStudentRequestOutcome', () => {
	const emptySteps = {
		validationFailure: null,
		authFailure: null,
		userFailure: null,
		persistFailure: null,
	};

	it('returns validation failure first', () => {
		expect(
			resolveCreateStudentRequestOutcome({
				...emptySteps,
				validationFailure: { status: 400, error: 'Email is verplicht' },
				authFailure: { status: 403, error: 'Geen rechten' },
			}),
		).toEqual({ status: 400, body: { error: 'Email is verplicht' } });
	});

	it('returns auth failure when validation passed', () => {
		expect(
			resolveCreateStudentRequestOutcome({
				...emptySteps,
				authFailure: { status: 403, error: 'Onvoldoende rechten' },
			}),
		).toEqual({ status: 403, body: { error: 'Onvoldoende rechten' } });
	});

	it('returns user failure when auth passed', () => {
		expect(
			resolveCreateStudentRequestOutcome({
				...emptySteps,
				userFailure: { status: 404, error: 'Gebruiker niet gevonden' },
			}),
		).toEqual({ status: 404, body: { error: 'Gebruiker niet gevonden' } });
	});

	it('returns persist failure when earlier steps passed', () => {
		expect(
			resolveCreateStudentRequestOutcome({
				...emptySteps,
				persistFailure: { status: 500, error: 'Kon profiel niet bijwerken' },
			}),
		).toEqual({ status: 500, body: { error: 'Kon profiel niet bijwerken' } });
	});

	it('returns 500 when no user id is available after successful steps', () => {
		expect(resolveCreateStudentRequestOutcome(emptySteps)).toEqual({
			status: 500,
			body: { error: 'Kon gebruiker niet aanmaken' },
		});
	});

	it('returns success with user id', () => {
		expect(
			resolveCreateStudentRequestOutcome({
				...emptySteps,
				userId: '11111111-1111-1111-1111-111111111111',
			}),
		).toEqual({
			status: 200,
			body: { user_id: '11111111-1111-1111-1111-111111111111' },
		});
	});
});

describe('readCreateStudentStepFailure', () => {
	it('reads the error message from the response body', () => {
		expect(readCreateStudentStepFailure(403, { error: 'Onvoldoende rechten' })).toEqual({
			status: 403,
			error: 'Onvoldoende rechten',
		});
	});

	it('falls back when the response body has no error field', () => {
		expect(readCreateStudentStepFailure(500, null)).toEqual({
			status: 500,
			error: 'Onbekende fout',
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
