import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type Stripe from 'npm:stripe@17.5.0';
import { jsonResponse } from '../_shared/http.ts';
import { getSafeErrorMessage } from '../_shared/stripe.ts';
import { resolveStripeSubscriptionId } from './resolveSubscriptionId.ts';
import { syncSubscriptionFromStripe } from './syncSubscriptionFromStripe.ts';
import type { Body } from './types.ts';

async function runSyncStripeSubscription(admin: SupabaseClient, stripe: Stripe, body: Body): Promise<Response> {
	const resolved = await resolveStripeSubscriptionId(admin, stripe, {
		stripeSubscriptionId: body.stripe_subscription_id,
		lessonAgreementId: body.lesson_agreement_id,
	});
	if (!resolved.ok) return resolved.response;

	return syncSubscriptionFromStripe(admin, stripe, resolved.resolved);
}

export async function runSyncStripeSubscriptionWithErrorHandling(
	admin: SupabaseClient,
	stripe: Stripe,
	body: Body,
): Promise<Response> {
	try {
		return await runSyncStripeSubscription(admin, stripe, body);
	} catch (err) {
		console.error('sync error', err);
		return jsonResponse(500, { error: getSafeErrorMessage(err, 'Kon subscription niet syncen') });
	}
}
