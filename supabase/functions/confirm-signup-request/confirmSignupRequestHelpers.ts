import { corsHeaders } from '../_shared/cors.ts';
import { isPlausibleUrlToken } from '../_shared/tokenCryptoHelpers.ts';

export const SIGNUP_CONFIRM_INVALID_MESSAGE = 'Ongeldige of al gebruikte bevestigingslink.';
export const SIGNUP_CONFIRM_MAIL_WARN = 'Je aanmelding is bevestigd; de bevestigingsmail kon niet worden verzonden.';

export function buildConfirmSignupSuccessBody(mailSent: boolean): {
	ok: true;
	mail_sent: boolean;
	message?: string;
} {
	if (mailSent) return { ok: true, mail_sent: true };
	return { ok: true, mail_sent: false, message: SIGNUP_CONFIRM_MAIL_WARN };
}

/** Token update must clear hash and leave a pending row; otherwise treat as invalid. */
export function resolveConfirmUpdateResult<T>(
	error: { message?: string } | null,
	data: T | null,
): { ok: true; row: T } | { ok: false; logError: boolean } {
	if (error) return { ok: false, logError: true };
	if (!data) return { ok: false, logError: false };
	return { ok: true, row: data };
}

export function resolveConfirmMethodResponse(method: string): Response | null {
	if (method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: corsHeaders });
	}
	if (method !== 'POST') {
		return new Response(JSON.stringify({ error: 'Method not allowed' }), {
			status: 405,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
	return null;
}

function resolveConfirmInvalidJsonResponse(): Response {
	return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
		status: 400,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

export function resolveConfirmInvalidTokenResponse(): Response {
	return new Response(JSON.stringify({ error: SIGNUP_CONFIRM_INVALID_MESSAGE }), {
		status: 400,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

export function buildConfirmSuccessResponse(mailSent: boolean): Response {
	return new Response(JSON.stringify(buildConfirmSignupSuccessBody(mailSent)), {
		status: 200,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

export async function parseConfirmRequestBody(
	req: Request,
): Promise<{ ok: true; token: string } | { ok: false; response: Response }> {
	try {
		const body = (await req.json()) as { token?: unknown };
		const token = typeof body.token === 'string' ? body.token : null;
		if (!isPlausibleUrlToken(token)) {
			return { ok: false, response: resolveConfirmInvalidTokenResponse() };
		}
		return { ok: true, token };
	} catch {
		return { ok: false, response: resolveConfirmInvalidJsonResponse() };
	}
}

export interface ConfirmServiceEnvConfig {
	supabaseUrl: string;
	serviceKey: string;
}

export function readConfirmServiceEnv(getEnv: (key: string) => string | undefined): ConfirmServiceEnvConfig {
	return {
		supabaseUrl: getEnv('SUPABASE_URL') ?? '',
		serviceKey: getEnv('SUPABASE_SERVICE_ROLE_KEY') ?? '',
	};
}
