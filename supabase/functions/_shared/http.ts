import { corsHeaders } from './cors.ts';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function jsonResponse(status: number, payload: unknown) {
	return new Response(JSON.stringify(payload), {
		status,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

export function handleCorsPreflight(req: Request): Response | null {
	if (req.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: corsHeaders });
	}
	return null;
}

export function requirePost(req: Request): Response | null {
	if (req.method !== 'POST') {
		return jsonResponse(405, { error: 'Method not allowed' });
	}
	return null;
}

export function requireAuthHeader(req: Request): string | Response {
	const authHeader = req.headers.get('Authorization');
	if (!authHeader) return jsonResponse(401, { error: 'Missing authorization header' });
	return authHeader;
}

async function parseJsonBody<T>(req: Request): Promise<T | Response> {
	try {
		return (await req.json()) as T;
	} catch {
		return jsonResponse(400, { error: 'Invalid JSON' });
	}
}

type AuthenticatedPostResult<T> = { ok: true; authHeader: string; body: T } | { ok: false; response: Response };

export async function beginAuthenticatedPostRequest<T>(req: Request): Promise<AuthenticatedPostResult<T>> {
	const preflight = handleCorsPreflight(req);
	if (preflight) return { ok: false, response: preflight };
	const notPost = requirePost(req);
	if (notPost) return { ok: false, response: notPost };
	const authHeader = requireAuthHeader(req);
	if (authHeader instanceof Response) return { ok: false, response: authHeader };
	const body = await parseJsonBody<T>(req);
	if (body instanceof Response) return { ok: false, response: body };
	return { ok: true, authHeader, body };
}

export function requireValidUuidField(value: string | undefined, fieldLabel: string): Response | null {
	if (!value || !UUID_RE.test(value)) {
		return jsonResponse(400, { error: `Ongeldig ${fieldLabel}` });
	}
	return null;
}

type AuthenticatedPostWithUuidResult<T> =
	| { ok: true; authHeader: string; body: T; uuid: string }
	| { ok: false; response: Response };

/** Authenticated POST handler that also validates a required UUID field on the body. */
export async function beginAuthenticatedPostWithUuidField<T>(
	req: Request,
	getUuid: (body: T) => string | undefined,
	fieldLabel: string,
): Promise<AuthenticatedPostWithUuidResult<T>> {
	const begun = await beginAuthenticatedPostRequest<T>(req);
	if (!begun.ok) return begun;
	const uuid = getUuid(begun.body);
	const invalidId = requireValidUuidField(uuid, fieldLabel);
	if (invalidId) return { ok: false, response: invalidId };
	return { ok: true, authHeader: begun.authHeader, body: begun.body, uuid: uuid as string };
}

const FALLBACK_SITE_URL = 'https://mcp.mplifi.nl';
const ALLOWED_SITE_HOSTS = new Set([
	'mcp.mplifi.nl',
	'instant-setup-kit.lovable.app',
	'id-preview--098d4be4-b790-4fca-9806-d5dd653b8946.lovable.app',
	'098d4be4-b790-4fca-9806-d5dd653b8946.lovableproject.com',
]);

/** Return `candidate` as an origin string if it is an https URL on the allow-list, else null. */
export function resolveAllowedSiteUrl(candidate: string | null | undefined): string | null {
	if (!candidate) return null;
	try {
		const url = new URL(candidate);
		if (url.protocol === 'https:' && ALLOWED_SITE_HOSTS.has(url.hostname)) {
			return url.origin;
		}
	} catch {
		// invalid URL
	}
	return null;
}

/** Resolve HTTPS site origin from request Origin header or provided env/fallback values. */
export function resolveSiteBaseUrl(
	req: Request,
	envSiteUrl: string | null | undefined,
	fallback = FALLBACK_SITE_URL,
): string {
	const candidates = [req.headers.get('Origin'), envSiteUrl, fallback];

	for (const candidate of candidates) {
		const resolved = resolveAllowedSiteUrl(candidate);
		if (resolved) return resolved;
	}

	return fallback;
}
