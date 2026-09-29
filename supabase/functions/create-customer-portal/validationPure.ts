import { jsonResponse, UUID_RE } from '../_shared/http.ts';

export interface CustomerPortalBody {
	user_id?: string;
	return_url?: string;
}

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

export function resolvePortalReturnUrl(origin: string, returnUrl: string | undefined): string {
	return returnUrl ?? `${origin}/account/profile`;
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
