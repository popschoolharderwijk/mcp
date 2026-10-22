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

export function shouldUpdateCreatedUserPhone(phoneNumber: string | undefined): phoneNumber is string {
	return Boolean(phoneNumber);
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
