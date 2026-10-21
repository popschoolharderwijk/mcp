import {
	beginAuthenticatedPostWithUuidField,
	handleCorsPreflight,
	jsonResponse,
	requireAuthHeader,
	resolveSiteBaseUrl,
} from './http.ts';

export type LessonAgreementPostContext = {
	req: Request;
	authHeader: string;
	lessonAgreementId: string;
};

/** Edge-function entry for authenticated POST handlers keyed by lesson_agreement_id. */
export function serveLessonAgreementPost(handler: (ctx: LessonAgreementPostContext) => Promise<Response>): void {
	Deno.serve(async (req: Request) => {
		const begun = await beginAuthenticatedPostWithUuidField<{ lesson_agreement_id?: string }>(
			req,
			(body) => body.lesson_agreement_id,
			'lesson_agreement_id',
		);
		if (!begun.ok) return begun.response;
		const { authHeader, uuid: lessonAgreementId } = begun;
		return handler({ req, authHeader, lessonAgreementId });
	});
}

/** JSON edge function with CORS preflight and required Authorization header. */
export function serveAuthenticatedJsonRequest(handler: (req: Request, authHeader: string) => Promise<Response>): void {
	Deno.serve(async (req: Request) => {
		const preflight = handleCorsPreflight(req);
		if (preflight) return preflight;
		const authHeader = requireAuthHeader(req);
		if (authHeader instanceof Response) return authHeader;
		try {
			return await handler(req, authHeader);
		} catch (error) {
			console.error('Authenticated request error:', error);
			return jsonResponse(500, { error: 'Internal server error' });
		}
	});
}

/** Resolve HTTPS site origin from request Origin header or SITE_URL env. */
export function getSiteBaseUrl(req: Request, fallback = 'https://mcp.mplifi.nl'): string {
	return resolveSiteBaseUrl(req, Deno.env.get('SITE_URL'), fallback);
}

/**
 * Public JSON POST (no login): used by the fixed payment link page. The handler must do its
 * own authorisation (e.g. token hash check) and never leak personal data.
 */
export function servePublicJsonPost<T>(handler: (req: Request, body: T) => Promise<Response>): void {
	Deno.serve(async (req: Request) => {
		const preflight = handleCorsPreflight(req);
		if (preflight) return preflight;
		if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });
		let body: T;
		try {
			body = (await req.json()) as T;
		} catch {
			return jsonResponse(400, { error: 'Invalid JSON' });
		}
		try {
			return await handler(req, body);
		} catch (error) {
			console.error('Public request error:', error);
			return jsonResponse(500, { error: 'Er ging iets mis. Probeer het later opnieuw.' });
		}
	});
}
