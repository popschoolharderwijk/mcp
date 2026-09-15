export function canInitiateSubscriptionCheckout(
	callerUserId: string,
	studentUserId: string,
	isPrivileged: boolean,
): boolean {
	return isPrivileged || callerUserId === studentUserId;
}
