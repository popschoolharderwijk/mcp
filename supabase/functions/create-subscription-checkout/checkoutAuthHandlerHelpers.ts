function canInitiateSubscriptionCheckout(callerUserId: string, studentUserId: string, isPrivileged: boolean): boolean {
	return isPrivileged || callerUserId === studentUserId;
}

export function resolveCheckoutInitiatorAuthorization(
	rpcError: unknown,
	callerUserId: string,
	studentUserId: string,
	isPrivileged: boolean | null,
): { status: number; error: string } | null {
	if (rpcError) {
		return { status: 500, error: 'Kon rechten niet controleren' };
	}
	if (!canInitiateSubscriptionCheckout(callerUserId, studentUserId, isPrivileged === true)) {
		return { status: 403, error: 'Geen rechten om betaling te starten voor deze overeenkomst.' };
	}
	return null;
}
