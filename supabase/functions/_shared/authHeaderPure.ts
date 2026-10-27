/** Extracts the raw JWT from an `Authorization: Bearer <token>` header; undefined when absent. */
export function bearerTokenFromHeader(authHeader: string | null | undefined): string | undefined {
	if (!authHeader) return undefined;
	const token = authHeader.replace(/^Bearer\s+/i, '').trim();
	return token.length > 0 ? token : undefined;
}
