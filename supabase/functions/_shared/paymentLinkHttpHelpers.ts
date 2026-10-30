/** Shared public POST helpers for payment-link edge functions (Bun-testable). */

import { handleCorsPreflight, jsonResponse, requirePost, UUID_RE } from './http.ts';

export type PublicJsonPostResult<T> = { ok: true; body: T } | { ok: false; response: Response };

export async function beginPublicJsonPost<T>(req: Request): Promise<PublicJsonPostResult<T>> {
	const preflight = handleCorsPreflight(req);
	if (preflight) return { ok: false, response: preflight };
	const notPost = requirePost(req);
	if (notPost) return { ok: false, response: notPost };
	try {
		return { ok: true, body: (await req.json()) as T };
	} catch {
		return { ok: false, response: jsonResponse(400, { error: 'Invalid JSON' }) };
	}
}

export type PaymentLinkTokenFields = {
	lesson_agreement_id: string;
	token: string;
};

export function parsePaymentLinkTokenBody(body: {
	lesson_agreement_id?: string;
	token?: string;
}): PaymentLinkTokenFields | null {
	const agreementId = body.lesson_agreement_id;
	const token = body.token;
	if (!agreementId || !UUID_RE.test(agreementId) || !token) return null;
	return { lesson_agreement_id: agreementId, token };
}

export function invalidPaymentLinkParamsResponse(): Response {
	return jsonResponse(400, { error: 'Ongeldige parameters' });
}

export type PublicPaymentLinkTokenRequest =
	| { ok: false; response: Response }
	| { ok: true; agreementId: string; token: string; body: { lesson_agreement_id?: string; token?: string } };

/** Shared entry for public payment-link POSTs that require agreement id + token. */
export async function beginPublicPaymentLinkTokenRequest(req: Request): Promise<PublicPaymentLinkTokenRequest> {
	const begun = await beginPublicJsonPost<{ lesson_agreement_id?: string; token?: string }>(req);
	if (!begun.ok) return begun;
	const parsed = parsePaymentLinkTokenBody(begun.body);
	if (!parsed) return { ok: false, response: invalidPaymentLinkParamsResponse() };
	return {
		ok: true,
		agreementId: parsed.lesson_agreement_id,
		token: parsed.token,
		body: begun.body,
	};
}
