import { supabase } from '@/integrations/supabase/client';

/**
 * Helpers for processing magic-link landings (PKCE and token_hash).
 * Used from DirectDebitStart and any other magic-link landing pages.
 */

export type MagicLinkResult = { ok: true } | { ok: false; error: string };

function getHashParams(): URLSearchParams {
	return new URLSearchParams(window.location.hash.slice(1));
}

/** Reads a Supabase auth error from the URL hash, if present. */
export function readMagicLinkUrlError(): string | null {
	if (!window.location.hash.includes('error=')) return null;
	const hashParams = getHashParams();
	const code = hashParams.get('error_code');
	if (code === 'otp_expired') {
		return 'Deze inloglink is verlopen of al gebruikt. Vraag een nieuwe link aan.';
	}
	return hashParams.get('error_description') ?? 'Inloggen via deze link is mislukt.';
}

/**
 * Exchanges a magic link from the URL for an active session.
 * Supports PKCE (?code=...) and custom token_hash flow (#token_hash=...&type=email).
 */
export async function consumeMagicLinkFromUrl(): Promise<MagicLinkResult> {
	// PKCE flow: ?code=... in querystring (Supabase default since v2).
	if (window.location.search.includes('code=')) {
		const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
		if (error) {
			return { ok: false, error: `Inloggen mislukt: ${error.message}. De link is mogelijk verlopen.` };
		}
		return { ok: true };
	}

	// Custom email-template flow: #token_hash=...&type=email.
	// Prevents mail scanners from consuming the Supabase ConfirmationURL prematurely.
	if (window.location.hash.includes('token_hash=')) {
		const hashParams = getHashParams();
		const tokenHash = hashParams.get('token_hash');
		const type = hashParams.get('type') ?? 'email';
		if (!tokenHash || type !== 'email') {
			return { ok: false, error: 'Ongeldige uitnodigingslink. Vraag een nieuwe link aan.' };
		}
		const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
		if (error) {
			return { ok: false, error: `Inloggen mislukt: ${error.message}. De link is mogelijk verlopen.` };
		}
		// Clear hash so tokens are not left in browser history.
		window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
		return { ok: true };
	}

	// No magic-link parameters in URL: existing session is checked elsewhere.
	return { ok: true };
}

/** Reads an error field from an edge-function response or Response object. */
export async function getFunctionErrorMessage(data: unknown, error: unknown, fallback: string): Promise<string> {
	const dataError = typeof data === 'object' && data !== null && 'error' in data ? data.error : null;
	if (typeof dataError === 'string') return dataError;

	const context = typeof error === 'object' && error !== null && 'context' in error ? error.context : null;
	if (context instanceof Response) {
		try {
			const payload: unknown = await context.clone().json();
			const payloadError =
				typeof payload === 'object' && payload !== null && 'error' in payload ? payload.error : null;
			if (typeof payloadError === 'string') return payloadError;
		} catch {
			// Ignore malformed error bodies and fall back below.
		}
	}

	return error instanceof Error ? error.message : fallback;
}
