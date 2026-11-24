/**
 * Public signup submit rate limits. No Deno/DB IO — Bun-testable.
 */

export const SIGNUP_SUBMITS_PER_EMAIL_PER_HOUR = 3;
export const SIGNUP_SUBMITS_PER_IP_PER_HOUR = 10;
const SIGNUP_CONFIRMATION_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

export const SIGNUP_RATE_LIMIT_MESSAGE = 'Te veel aanmeldpogingen. Probeer het later opnieuw.';

export function normalizeSignupRateLimitEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function isSignupEmailRateLimited(recentCount: number, limit = SIGNUP_SUBMITS_PER_EMAIL_PER_HOUR): boolean {
	return recentCount >= limit;
}

export function isSignupIpRateLimited(recentCount: number, limit = SIGNUP_SUBMITS_PER_IP_PER_HOUR): boolean {
	return recentCount >= limit;
}

/** Skip IP bucket when the client IP cannot be determined (no shared null bucket). */
export function shouldEnforceSignupIpRateLimit(clientIp: string | null): clientIp is string {
	return clientIp !== null && clientIp.length > 0;
}

export function signupSubmitWindowStart(now = new Date()): string {
	return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
}

export function signupConfirmationExpiresAt(now = new Date()): string {
	return new Date(now.getTime() + SIGNUP_CONFIRMATION_TOKEN_TTL_MS).toISOString();
}

export function resolveSignupClientIp(headers: Headers): string | null {
	const cf = headers.get('cf-connecting-ip')?.trim();
	if (cf) return cf;
	const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
	if (forwarded) return forwarded;
	return null;
}
