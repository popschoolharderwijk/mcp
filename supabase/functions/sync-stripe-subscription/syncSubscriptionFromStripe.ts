import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type Stripe from 'npm:stripe@17.5.0';
import { jsonResponse } from '../_shared/http.ts';
import { shouldClearAgreementScheduleForSubscriptionStatus } from '../_shared/stripeWebhookHandlersHelpers.ts';
import { writeSubscriptionState } from '../_shared/subscription-storage.ts';
import { clearAgreementScheduleId } from '../_shared/subscriptionScheduleCancel.ts';
import { buildSubscriptionPayload } from './buildSubscriptionPayload.ts';

async function persistSyncedSubscription(
	admin: SupabaseClient,
	sub: Stripe.Subscription,
	lessonAgreementId: string,
	scheduleIdFromDb: string | null,
): Promise<void> {
	const payload = buildSubscriptionPayload(sub, lessonAgreementId, scheduleIdFromDb);
	await writeSubscriptionState(admin, payload);
	if (shouldClearAgreementScheduleForSubscriptionStatus(payload.status)) {
		await clearAgreementScheduleId(admin, lessonAgreementId);
	}
}

export async function syncSubscriptionFromStripe(
	admin: SupabaseClient,
	stripe: Stripe,
	args: {
		stripeSubscriptionId: string;
		lessonAgreementIdHint: string | null;
		scheduleIdFromDb: string | null;
	},
): Promise<Response> {
	const sub = await stripe.subscriptions.retrieve(args.stripeSubscriptionId, {
		expand: ['default_payment_method', 'latest_invoice'],
	});

	const lessonAgreementId = sub.metadata?.lesson_agreement_id ?? args.lessonAgreementIdHint;
	if (!lessonAgreementId) {
		return jsonResponse(400, { error: 'Subscription mist lesson_agreement_id metadata' });
	}

	await persistSyncedSubscription(admin, sub, lessonAgreementId, args.scheduleIdFromDb);
	return jsonResponse(200, { synced: true, status: sub.status });
}
