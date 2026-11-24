import type { CreateUserRequestBody } from './create-user-validation.ts';

export function buildCreateUserSuccessResponse(userId: string, email: string | undefined) {
	return {
		message: 'Gebruiker succesvol aangemaakt',
		user_id: userId,
		email,
	};
}

export function buildCreateUserRoleWarningResponse(
	userId: string,
	warning: string,
): { message: string; user_id: string; warning: string } {
	return {
		message: 'Gebruiker aangemaakt, maar rol kon niet worden toegewezen.',
		user_id: userId,
		warning,
	};
}

function shouldUpdateCreatedUserPhone(phoneNumber: string | undefined): phoneNumber is string {
	return Boolean(phoneNumber);
}

function shouldUpdateCreatedUserDateOfBirth(dateOfBirth: string | null | undefined): dateOfBirth is string {
	return Boolean(dateOfBirth);
}

export function buildCreatedUserProfilePatch(body: {
	phone_number?: string;
	date_of_birth?: string | null;
}): { phone_number?: string; date_of_birth?: string } | null {
	const patch: { phone_number?: string; date_of_birth?: string } = {};
	if (shouldUpdateCreatedUserPhone(body.phone_number)) {
		patch.phone_number = body.phone_number;
	}
	if (shouldUpdateCreatedUserDateOfBirth(body.date_of_birth)) {
		patch.date_of_birth = body.date_of_birth;
	}
	if (!patch.phone_number && !patch.date_of_birth) return null;
	return patch;
}

export function shouldAssignCreateUserRole(
	role: CreateUserRequestBody['role'],
): role is NonNullable<CreateUserRequestBody['role']> {
	return Boolean(role);
}

export function resolveMissingCreatedUserError(): string {
	return 'Gebruiker kon niet worden aangemaakt';
}

export function hasCreatedAuthUser(
	user: { id: string; email?: string } | null | undefined,
): user is { id: string; email?: string } {
	return Boolean(user);
}
