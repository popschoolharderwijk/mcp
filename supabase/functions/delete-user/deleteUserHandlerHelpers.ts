export function resolveDeleteUserAuthFailure(
	userError: unknown,
	requestingUser: { id: string } | null,
): { status: number; error: string } | null {
	if (userError || !requestingUser) {
		return { status: 401, error: 'Invalid or expired token' };
	}
	return null;
}

export function buildDeleteUserSuccessResponse(): { message: string } {
	return { message: 'Account successfully deleted' };
}

export function resolveMissingRequestingUser(
	requestingUser: { id: string } | null,
): { status: number; error: string } | null {
	if (!requestingUser) {
		return { status: 401, error: 'Invalid or expired token' };
	}
	return null;
}

export function resolveDeleteUserRequestAuth(
	userError: unknown,
	requestingUser: { id: string } | null,
): { status: number; error: string } | null {
	return resolveDeleteUserAuthFailure(userError, requestingUser) ?? resolveMissingRequestingUser(requestingUser);
}
