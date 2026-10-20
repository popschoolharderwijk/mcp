import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import { getSafeErrorMessage, getStripe } from '../_shared/stripe.ts';
import { authorizeCustomerPortalAccess, beginCustomerPortalPost } from './beginCustomerPortal.ts';
import {
	buildCustomerPortalSuccessPayload,
	type CustomerPortalBody,
	resolveMissingStripeCustomerResponse,
	resolvePortalReturnUrl,
} from './validationPure.ts';

async function createCustomerPortalSession(
	admin: SupabaseClient,
	targetUserId: string,
	body: CustomerPortalBody,
	origin: string,
): Promise<Response> {
	const { data: customerRow } = await admin
		.from('stripe_customers')
		.select('stripe_customer_id')
		.eq('user_id', targetUserId)
		.maybeSingle();
	if (!customerRow?.stripe_customer_id) {
		return resolveMissingStripeCustomerResponse();
	}

	try {
		const stripe = getStripe();
		// Portal configuration without cancelling (created by sync-stripe-catalog).
		const { data: settings } = await admin
			.from('accounting_settings')
			.select('stripe_portal_configuration_id')
			.eq('id', true)
			.maybeSingle();
		const session = await stripe.billingPortal.sessions.create({
			customer: customerRow.stripe_customer_id,
			return_url: resolvePortalReturnUrl(origin, body.return_url),
			...(settings?.stripe_portal_configuration_id
				? { configuration: settings.stripe_portal_configuration_id }
				: {}),
		});
		return jsonResponse(200, buildCustomerPortalSuccessPayload(session.url));
	} catch (err) {
		console.error('portal error', err);
		return jsonResponse(500, { error: getSafeErrorMessage(err, 'Kon klantportaal niet openen') });
	}
}

export async function handleCreateCustomerPortalRequest(req: Request): Promise<Response> {
	const begun = await beginCustomerPortalPost(req);
	if (!begun.ok) return begun.response;

	const authorized = await authorizeCustomerPortalAccess(begun.authHeader, begun.body);
	if (!authorized.ok) return authorized.response;

	return createCustomerPortalSession(authorized.admin, authorized.targetUserId, begun.body, begun.origin);
}
