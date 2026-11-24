import type { SignupRequestRow } from './types.ts';

export function resolveExistingSignupStudentUserId(
	existingProfile: { user_id: string } | null | undefined,
): string | null {
	return existingProfile?.user_id ?? null;
}

export function shouldUpdateSignupPhoneOnCreate(phoneNumber: string | null): boolean {
	return phoneNumber != null && phoneNumber.length > 0;
}

export function buildSignupAuthCreatePayload(reqRow: SignupRequestRow) {
	return {
		email: reqRow.email,
		email_confirm: true,
		user_metadata: {
			first_name: reqRow.first_name,
			last_name: reqRow.last_name,
		},
	};
}

export function buildSignupStudentPayload(studentUserId: string, reqRow: SignupRequestRow) {
	return {
		user_id: studentUserId,
		parent_name: reqRow.parent_name ?? null,
		parent_email: reqRow.parent_email ?? null,
		parent_phone_number: reqRow.parent_phone_number ?? null,
	};
}

export function buildSignupProfileUpdateFields(reqRow: SignupRequestRow) {
	return {
		date_of_birth: reqRow.date_of_birth ?? null,
	};
}

export type ExistingSignupAccountAction = 'reuse' | 'conflict';

/** Existing non-student accounts must not be converted during signup approval. */
export function resolveExistingSignupAccountAction(
	existingStudent: { user_id: string } | null | undefined,
): ExistingSignupAccountAction {
	return existingStudent ? 'reuse' : 'conflict';
}

export function resolveExistingNonStudentConflictResponse(): { status: 409; error: string } {
	return {
		status: 409,
		error: 'Er bestaat al een account met dit e-mailadres dat geen leerling is',
	};
}
