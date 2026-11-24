/**
 * URL tokens stored as SHA-256 hex only (payment links, signup confirm).
 * No Deno/DB IO — Bun-testable.
 */

const URL_TOKEN_BYTES = 32;

function toBase64Url(bytes: Uint8Array): string {
	let bin = '';
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generateUrlToken(): string {
	const bytes = new Uint8Array(URL_TOKEN_BYTES);
	crypto.getRandomValues(bytes);
	return toBase64Url(bytes);
}

export async function hashUrlToken(token: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

function safeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

export function isPlausibleUrlToken(token: string | null | undefined): token is string {
	return typeof token === 'string' && /^[A-Za-z0-9_-]{40,64}$/.test(token);
}

export async function urlTokenMatches(
	token: string | null | undefined,
	storedHash: string | null | undefined,
): Promise<boolean> {
	if (!isPlausibleUrlToken(token) || !storedHash) return false;
	return safeEqual(await hashUrlToken(token), storedHash);
}
