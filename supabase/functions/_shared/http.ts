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

type ValidatedPostBodyResult<T> = { ok: true; body: T } | { ok: false; response: Response };

/** Authenticated POST with a caller-defined body validation step. */
export async function beginAuthenticatedPostWithBodyValidation<T>(
	req: Request,
	validate: (body: unknown) => ValidatedPostBodyResult<T>,
): Promise<AuthenticatedPostResult<T>> {
	const begun = await beginAuthenticatedPostRequest<unknown>(req);
	if (!begun.ok) return begun;
	const validated = validate(begun.body);
	if (!validated.ok) return validated;
	return { ok: true, authHeader: begun.authHeader, body: validated.body };
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
const LOOPBACK_SITE_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

function isAllowedHttpsSiteHost(hostname: string): boolean {
	return ALLOWED_SITE_HOSTS.has(hostname);
}

function isLoopbackSiteHost(hostname: string): boolean {
	return LOOPBACK_SITE_HOSTS.has(hostname);
}

/** Hosted sites: https allow-list. Local Vite (`bun run dev:local`): http loopback only. */
function isAllowedSiteUrl(url: URL): boolean {
	if (url.protocol === 'https:' && isAllowedHttpsSiteHost(url.hostname)) return true;
	return url.protocol === 'http:' && isLoopbackSiteHost(url.hostname);
}

function resolveAllowedUrl(candidate: string | null | undefined, format: (url: URL) => string): string | null {
	if (!candidate) return null;
	try {
		const url = new URL(candidate);
		if (isAllowedSiteUrl(url)) return format(url);
	} catch {
		// invalid URL
	}
	return null;
}

/** Return `candidate` as an origin when it is an allow-listed site URL, else null. */
export function resolveAllowedSiteUrl(candidate: string | null | undefined): string | null {
	return resolveAllowedUrl(candidate, (url) => url.origin);
}

/** Return the full redirect URL when it is an allow-listed site URL, else null. */
export function resolveAllowedRedirectUrl(candidate: string | null | undefined): string | null {
	return resolveAllowedUrl(candidate, (url) => url.toString());
}

/** Resolve site origin from request Origin header or provided env/fallback values. */
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
