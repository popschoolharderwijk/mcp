import { corsHeaders } from '../_shared/cors.ts';

export function buildSignupInsertErrorMessage(error: { message: string; code?: string | null }): string {
	return `Kon aanmelding niet opslaan: ${error.message}${error.code ? ` (${error.code})` : ''}`;
}

export function buildSignupInsertErrorResponse(error: { message: string; code?: string | null }): Response {
	return new Response(JSON.stringify({ error: buildSignupInsertErrorMessage(error) }), {
		status: 500,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

export function buildSignupSuccessResponse(id: string): Response {
	return new Response(JSON.stringify({ id }), {
		status: 200,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

function resolveSignupOptionsResponse(): Response {
	return new Response(null, { status: 204, headers: corsHeaders });
}

function resolveSignupMethodNotAllowedResponse(): Response {
	return new Response(JSON.stringify({ error: 'Method not allowed' }), {
		status: 405,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

export function resolveSignupInvalidJsonResponse(): Response {
	return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
		status: 400,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

export function resolveSignupMethodResponse(method: string): Response | null {
	if (method === 'OPTIONS') return resolveSignupOptionsResponse();
	if (method !== 'POST') return resolveSignupMethodNotAllowedResponse();
	return null;
}

export async function parseSignupRequestBody(
	req: Request,
): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
	try {
		return { ok: true, body: await req.json() };
	} catch {
		return { ok: false, response: resolveSignupInvalidJsonResponse() };
	}
}

export function shouldSendSignupConfirmationEmail(responseStatus: number): boolean {
	return responseStatus === 200;
}

export interface SignupServiceEnvConfig {
	supabaseUrl: string;
	serviceKey: string;
}

export function readSignupServiceEnv(getEnv: (key: string) => string | undefined): SignupServiceEnvConfig {
	return {
		supabaseUrl: getEnv('SUPABASE_URL') ?? '',
		serviceKey: getEnv('SUPABASE_SERVICE_ROLE_KEY') ?? '',
	};
}
