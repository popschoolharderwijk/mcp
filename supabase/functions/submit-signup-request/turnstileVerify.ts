import {
	buildTurnstileSiteverifyForm,
	resolveTurnstileSiteverifyOutcome,
	type TurnstileSiteverifyPayload,
} from './turnstileVerifyHelpers.ts';

const TURNSTILE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

async function requestTurnstileSiteverify(input: {
	secret: string;
	token: string;
	remoteip: string | null;
}): Promise<boolean> {
	const form = buildTurnstileSiteverifyForm(input.secret, input.token, input.remoteip);
	const resp = await fetch(TURNSTILE_SITEVERIFY_URL, {
		method: 'POST',
		body: form,
	});
	const payload = (await resp.json().catch(() => ({}))) as TurnstileSiteverifyPayload;
	const outcome = resolveTurnstileSiteverifyOutcome(resp.ok, payload);
	if (outcome === 'http_error') console.error('turnstile siteverify http', resp.status);
	if (outcome === 'payload_failed') {
		console.error('turnstile siteverify failed', payload['error-codes'] ?? []);
	}
	return outcome === 'ok';
}

export async function verifyTurnstileToken(input: {
	secret: string;
	token: string;
	remoteip: string | null;
}): Promise<boolean> {
	if (!input.secret) {
		console.error('turnstile secret missing');
		return false;
	}
	try {
		return await requestTurnstileSiteverify(input);
	} catch (error) {
		console.error('turnstile siteverify network', error);
		return false;
	}
}
