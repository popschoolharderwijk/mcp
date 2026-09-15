import { isDuplicateCreateUserError } from '../_shared/create-user-validation.ts';

export function resolveCreateStudentAuthError(message: string): { status: number; error: string } {
	if (isDuplicateCreateUserError(message)) {
		return { status: 409, error: 'Een gebruiker met dit e-mailadres bestaat al.' };
	}
	return { status: 400, error: message };
}

export function resolveCreateStudentPersistFailure(
	writeError: unknown,
	error: string,
): { status: number; error: string } | null {
	if (!writeError) return null;
	return { status: 500, error };
}

export function resolveCreateStudentValidationFailure(
	validationError: string | null,
): { status: number; error: string } | null {
	if (!validationError) return null;
	return { status: 400, error: validationError };
}
