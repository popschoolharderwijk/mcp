import { jsonResponse } from '../_shared/http.ts';
import { getSafeErrorMessage, getStripe } from '../_shared/stripe.ts';
import { authenticateCheckoutRequest } from './authenticateCheckoutRequest.ts';
import { ensureStripeCustomer, handleCheckoutMode, handleCompleteMode, handleDirectMode } from './checkoutFlows.ts';
import { resolveCheckoutFlowMode } from './createSubscriptionCheckoutHandlerHelpers.ts';

export async function handleCreateSubscriptionCheckoutRequest(req: Request): Promise<Response> {
	const auth = await authenticateCheckoutRequest(req);
	if (!auth.ok) return auth.response;

	try {
		const stripe = getStripe();
		return await resolveCheckoutFlowMode(auth.mode, {
			complete: () =>
				handleCompleteMode(auth.clients.admin, stripe, auth.loaded.agreement, auth.body.checkout_session_id),
			direct: async () => {
				const customerId = await ensureStripeCustomer(
					auth.clients.admin,
					stripe,
					auth.loaded.billingUserId,
					auth.loaded.profile,
				);
				return handleDirectMode(auth.clients.admin, stripe, auth.loaded.agreement, customerId);
			},
			checkout: async () => {
				const customerId = await ensureStripeCustomer(
					auth.clients.admin,
					stripe,
					auth.loaded.billingUserId,
					auth.loaded.profile,
				);
				return handleCheckoutMode(stripe, req, auth.loaded.agreement, customerId, auth.body);
			},
		});
	} catch (err) {
		console.error('checkout/schedule error', err);
		return jsonResponse(500, { error: getSafeErrorMessage(err, 'Kon Stripe flow niet starten') });
	}
}
