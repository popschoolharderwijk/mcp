import type { CustomerPortalBody } from './validationHelpers.ts';

export function resolveCustomerPortalPostGate(
	preflight: Response | null,
	notPost: Response | null,
	authHeader: string | Response,
): { ok: false; response: Response } | { ok: true; authHeader: string } {
	if (preflight) return { ok: false, response: preflight };
	if (notPost) return { ok: false, response: notPost };
	if (authHeader instanceof Response) return { ok: false, response: authHeader };
	return { ok: true, authHeader };
}

export function buildCustomerPortalPostSuccess(
	authHeader: string,
	body: CustomerPortalBody,
	origin: string | null,
): { ok: true; authHeader: string; body: CustomerPortalBody; origin: string } {
	return { ok: true, authHeader, body, origin: origin ?? '' };
}
