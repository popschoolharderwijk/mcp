import { beginAuthenticatedPostWithUuidField, handleCorsPreflight, jsonResponse, requireAuthHeader } from './http.ts';

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
