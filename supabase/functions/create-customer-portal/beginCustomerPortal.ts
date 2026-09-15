import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflight, requireAuthHeader, requirePost } from '../_shared/http.ts';
import { createSupabaseClients, requireAuthenticatedUser } from '../_shared/supabase.ts';
import { buildCustomerPortalPostSuccess, resolveCustomerPortalPostGate } from './beginCustomerPortalPure.ts';
import { resolveCustomerPortalTargetUserId } from './validation.ts';
import {
	type CustomerPortalBody,
	parseCustomerPortalRequestBody,
	validateCustomerPortalUserId,
} from './validationPure.ts';

export async function beginCustomerPortalPost(
	req: Request,
): Promise<
	{ ok: false; response: Response } | { ok: true; authHeader: string; body: CustomerPortalBody; origin: string }
> {
	const gate = resolveCustomerPortalPostGate(handleCorsPreflight(req), requirePost(req), requireAuthHeader(req));
	if (!gate.ok) return gate;

	const body = await parseCustomerPortalRequestBody(req);
	const userIdError = validateCustomerPortalUserId(body.user_id);
	if (userIdError) return { ok: false, response: userIdError };

	return buildCustomerPortalPostSuccess(gate.authHeader, body, req.headers.get('origin'));
}

export async function authorizeCustomerPortalAccess(
	authHeader: string,
	body: CustomerPortalBody,
): Promise<{ ok: false; response: Response } | { ok: true; admin: SupabaseClient; targetUserId: string }> {
	const { userClient, admin } = createSupabaseClients(authHeader);
	const authn = await requireAuthenticatedUser(userClient);
	if (!authn.ok) return { ok: false, response: authn.response };

	const target = await resolveCustomerPortalTargetUserId(userClient, authn.user.id, body.user_id);
	if (target.error) return { ok: false, response: target.error };

	return { ok: true, admin, targetUserId: target.targetUserId };
}
