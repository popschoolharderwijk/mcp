import { jsonResponse, resolveAllowedRedirectUrl, UUID_RE } from '../_shared/http.ts';

export interface CustomerPortalBody {
	user_id?: string;
	return_url?: string;
}

export type PortalReturnUrlResult = { ok: true; returnUrl: string } | { ok: false; error: string };

export function parseCustomerPortalBody(raw: unknown): CustomerPortalBody {
	if (!raw || typeof raw !== 'object') return {};
	return raw as CustomerPortalBody;
}

export function validateCustomerPortalUserId(userId: string | undefined): Response | null {
	if (userId && !UUID_RE.test(userId)) {
		return jsonResponse(400, { error: 'Ongeldig user_id' });
	}
	return null;
}

export function canOpenPortalForOtherUser(role: string | null | undefined): boolean {
	return role === 'staff' || role === 'admin' || role === 'site_admin';
}

export function resolvePortalForOtherUserForbiddenResponse(): Response {
	return jsonResponse(403, { error: 'Geen rechten om portal voor andere gebruiker te openen' });
}

export function resolveMissingStripeCustomerResponse(): Response {
	return jsonResponse(404, { error: 'Geen Stripe klant gekoppeld' });
}

/** Allow-listed return_url, or profile path on the allow-listed origin when omitted. */
export function resolvePortalReturnUrl(origin: string, returnUrl: string | undefined): PortalReturnUrlResult {
	const defaultReturnUrl = `${origin}/account/profile`;
	if (!returnUrl) return { ok: true, returnUrl: defaultReturnUrl };
	const allowed = resolveAllowedRedirectUrl(returnUrl);
	if (!allowed) return { ok: false, error: 'Ongeldige return_url' };
	return { ok: true, returnUrl: allowed };
}

export type CustomerPortalSessionSetup =
	| { ok: false; response: Response }
	| { ok: true; stripeCustomerId: string; returnUrl: string };

/** Missing Stripe customer or invalid return_url before creating a portal session. */
export function resolveCustomerPortalSessionSetup(
	stripeCustomerId: string | null | undefined,
	origin: string,
	returnUrl: string | undefined,
): CustomerPortalSessionSetup {
	if (!stripeCustomerId) {
		return { ok: false, response: resolveMissingStripeCustomerResponse() };
	}
	const returnUrlResult = resolvePortalReturnUrl(origin, returnUrl);
	if (!returnUrlResult.ok) {
		return { ok: false, response: jsonResponse(400, { error: returnUrlResult.error }) };
	}
	return { ok: true, stripeCustomerId, returnUrl: returnUrlResult.returnUrl };
}

export function buildCustomerPortalSuccessPayload(url: string | null): { url: string | null } {
	return { url };
}

export async function parseCustomerPortalRequestBody(req: Request): Promise<CustomerPortalBody> {
	try {
		return parseCustomerPortalBody(await req.json().catch(() => ({})));
	} catch {
		return {};
	}
}
