/**
 * Cloudflare Turnstile siteverify result helpers. No network IO — Bun-testable.
 */

export interface TurnstileSiteverifyPayload {
	success?: boolean;
	'error-codes'?: string[];
}

export type TurnstileSiteverifyOutcome = 'ok' | 'http_error' | 'payload_failed';

export function resolveTurnstileSiteverifyOutcome(
	httpOk: boolean,
	payload: TurnstileSiteverifyPayload,
): TurnstileSiteverifyOutcome {
	if (!httpOk) return 'http_error';
	if (payload.success !== true) return 'payload_failed';
	return 'ok';
}

export function buildTurnstileSiteverifyForm(secret: string, token: string, remoteip: string | null): URLSearchParams {
	const form = new URLSearchParams();
	form.set('secret', secret);
	form.set('response', token);
	if (remoteip) form.set('remoteip', remoteip);
	return form;
}
