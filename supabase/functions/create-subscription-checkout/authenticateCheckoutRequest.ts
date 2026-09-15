import type { User } from 'https://esm.sh/@supabase/supabase-js@2';
import { beginAuthenticatedPostRequest, jsonResponse } from '../_shared/http.ts';
import { createSupabaseClients, requireAuthenticatedUser } from '../_shared/supabase.ts';
import { resolveCheckoutInitiatorAuthorization } from './checkoutAuthHandlerPure.ts';
import { loadAgreementContext } from './loadAgreementContext.ts';
import type { Body } from './types.ts';
import { resolveCheckoutMode, validateCheckoutBody } from './validation.ts';

type CheckoutClients = ReturnType<typeof createSupabaseClients>;
type LoadedAgreement = Extract<Awaited<ReturnType<typeof loadAgreementContext>>, { ok: true }>;

async function beginCheckoutRequest(
	req: Request,
): Promise<{ ok: true; body: Body; authHeader: string } | { ok: false; response: Response }> {
	const begun = await beginAuthenticatedPostRequest<Body>(req);
	if (!begun.ok) return { ok: false, response: begun.response };

	const validationError = validateCheckoutBody(begun.body);
	if (validationError) return { ok: false, response: validationError };

	return { ok: true, body: begun.body, authHeader: begun.authHeader };
}

async function authenticateCheckoutClients(
	authHeader: string,
): Promise<{ ok: true; clients: CheckoutClients; user: User } | { ok: false; response: Response }> {
	const clients = createSupabaseClients(authHeader);
	const authn = await requireAuthenticatedUser(clients.userClient);
	if (!authn.ok) return { ok: false, response: authn.response };
	return { ok: true, clients, user: authn.user };
}

async function beginAuthenticatedCheckoutRequest(req: Request): Promise<
	| {
			ok: true;
			clients: CheckoutClients;
			user: User;
			body: Body;
	  }
	| { ok: false; response: Response }
> {
	const begun = await beginCheckoutRequest(req);
	if (!begun.ok) return begun;

	const auth = await authenticateCheckoutClients(begun.authHeader);
	if (!auth.ok) return auth;

	return { ok: true, clients: auth.clients, user: auth.user, body: begun.body };
}

async function runAuthenticateCheckoutRequest(req: Request): Promise<
	| {
			ok: true;
			mode: ReturnType<typeof resolveCheckoutMode>;
			clients: CheckoutClients;
			loaded: LoadedAgreement;
			body: Body;
	  }
	| { ok: false; response: Response }
> {
	const begun = await beginAuthenticatedCheckoutRequest(req);
	if (!begun.ok) return begun;

	const loaded = await loadAgreementContext(
		begun.clients.userClient,
		begun.clients.admin,
		begun.body.lesson_agreement_id,
	);
	if (!loaded.ok) return { ok: false, response: loaded.response };

	const { data: isPrivileged, error: privilegeError } = await begun.clients.userClient.rpc('is_privileged');
	const authzFailure = resolveCheckoutInitiatorAuthorization(
		privilegeError,
		begun.user.id,
		loaded.billingUserId,
		isPrivileged,
	);
	if (authzFailure) return { ok: false, response: jsonResponse(authzFailure.status, { error: authzFailure.error }) };

	return {
		ok: true,
		mode: resolveCheckoutMode(begun.body),
		clients: begun.clients,
		loaded,
		body: begun.body,
	};
}

export async function authenticateCheckoutRequest(req: Request): Promise<
	| {
			ok: true;
			mode: ReturnType<typeof resolveCheckoutMode>;
			clients: CheckoutClients;
			loaded: LoadedAgreement;
			body: Body;
	  }
	| { ok: false; response: Response }
> {
	return runAuthenticateCheckoutRequest(req);
}
