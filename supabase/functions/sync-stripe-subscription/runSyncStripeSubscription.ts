import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type Stripe from 'npm:stripe@17.5.0';
import { jsonResponse } from '../_shared/http.ts';
import { getSafeErrorMessage } from '../_shared/stripe.ts';
import { findOpenSubscription, recordRebuildError, syncAgreementSchedule } from '../_shared/subscriptionSchedule.ts';
import { resolveStripeSubscriptionId } from './resolveSubscriptionId.ts';
import { syncSubscriptionFromStripe } from './syncSubscriptionFromStripe.ts';
import type { Body } from './types.ts';

/**
 * Recovery: a mandate was given but the schedule could not be built (e.g. stale Stripe ids).
 * Without a schedule yet, build it now from the customer's default payment method.
 */
async function buildMissingSchedule(admin: SupabaseClient, stripe: Stripe, agreementId: string) {
	const open = await findOpenSubscription(admin, agreementId);
	if (open?.stripe_schedule_id || open?.stripe_subscription_id) return null;
	try {
		const built = await syncAgreementSchedule(admin, stripe, { agreementId });
		return jsonResponse(200, { synced: true, built });
	} catch (err) {
		return jsonResponse(409, { error: await recordRebuildError(admin, agreementId, err) });
	}
}

async function runSyncStripeSubscription(admin: SupabaseClient, stripe: Stripe, body: Body): Promise<Response> {
	if (!body.stripe_subscription_id && body.lesson_agreement_id) {
		const recovered = await buildMissingSchedule(admin, stripe, body.lesson_agreement_id);
		if (recovered) return recovered;
	}
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
