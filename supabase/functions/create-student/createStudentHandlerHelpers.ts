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

export type CreateStudentStepFailure = { status: number; error: string };

export type CreateStudentRequestSteps = {
	validationFailure: CreateStudentStepFailure | null;
	authFailure: CreateStudentStepFailure | null;
	userFailure: CreateStudentStepFailure | null;
	persistFailure: CreateStudentStepFailure | null;
	userId?: string;
};

export function resolveCreateStudentRequestOutcome(steps: CreateStudentRequestSteps): {
	status: number;
	body: { error: string } | { user_id: string };
} {
	if (steps.validationFailure) {
		return { status: steps.validationFailure.status, body: { error: steps.validationFailure.error } };
	}
	if (steps.authFailure) {
		return { status: steps.authFailure.status, body: { error: steps.authFailure.error } };
	}
	if (steps.userFailure) {
		return { status: steps.userFailure.status, body: { error: steps.userFailure.error } };
	}
	if (steps.persistFailure) {
		return { status: steps.persistFailure.status, body: { error: steps.persistFailure.error } };
	}
	if (!steps.userId) {
		return { status: 500, body: { error: 'Kon gebruiker niet aanmaken' } };
	}
	return { status: 200, body: { user_id: steps.userId } };
}

export function readCreateStudentStepFailure(
	status: number,
	body: { error?: string } | null,
): CreateStudentStepFailure {
	return { status, error: body?.error ?? 'Onbekende fout' };
}
