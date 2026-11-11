import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
	buildCanceledSubscriptionUpdate,
	resolveSubscriptionScheduleCancelTarget,
} from './stripeWebhookHandlersHelpers.ts';

export async function clearAgreementScheduleId(admin: SupabaseClient, lessonAgreementId: string): Promise<void> {
	const { error } = await admin
		.from('lesson_agreements')
		.update({ stripe_schedule_id: null })
		.eq('id', lessonAgreementId);
	if (error) throw error;
}

async function markSubscriptionCanceledBySchedule(
	admin: SupabaseClient,
	scheduleId: string,
	canceledAtIso: string,
): Promise<string | null> {
	const { data, error } = await admin
		.from('subscriptions')
		.select('id, lesson_agreement_id')
		.eq('stripe_schedule_id', scheduleId)
		.maybeSingle();
	if (error) throw error;
	if (!data) return null;
	const { error: updateError } = await admin
		.from('subscriptions')
		.update(buildCanceledSubscriptionUpdate(canceledAtIso))
		.eq('id', data.id);
	if (updateError) throw updateError;
	return data.lesson_agreement_id as string;
}

/** Mirror a canceled Stripe schedule into local subscription + clear agreement schedule id. */
export async function applyCanceledScheduleLocally(
	admin: SupabaseClient,
	schedule: {
		id: string;
		metadata?: { lesson_agreement_id?: string } | null;
		canceled_at?: number | null;
	},
): Promise<{ lessonAgreementId: string | null }> {
	const target = resolveSubscriptionScheduleCancelTarget(schedule);
	const canceledAtIso = target.canceledAtIso ?? new Date().toISOString();
	const agreementIdFromSub = await markSubscriptionCanceledBySchedule(admin, target.scheduleId, canceledAtIso);
	const lessonAgreementId = target.lessonAgreementId ?? agreementIdFromSub;
	if (lessonAgreementId) await clearAgreementScheduleId(admin, lessonAgreementId);
	return { lessonAgreementId };
}
