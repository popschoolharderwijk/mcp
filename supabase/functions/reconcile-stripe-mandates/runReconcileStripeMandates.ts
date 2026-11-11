import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type Stripe from 'npm:stripe@17.5.0';
import { getSafeErrorMessage } from '../_shared/stripe.ts';
import { applyCanceledScheduleLocally } from '../_shared/subscriptionScheduleCancel.ts';
import { syncSubscriptionFromStripe } from '../sync-stripe-subscription/syncSubscriptionFromStripe.ts';
import {
	classifyScheduleReconcileAction,
	mapSyncSubscriptionResponse,
	mergeReconcileCandidates,
	type ReconcileCandidate,
	type ReconcileItemOutcome,
	summarizeReconcileResults,
} from './reconcileStripeMandatesHelpers.ts';

function assertNoQueryError(error: { message: string } | null): void {
	if (error) throw error;
}

async function loadReconcileCandidates(admin: SupabaseClient): Promise<ReconcileCandidate[]> {
	const [subscriptionsRes, agreementsRes] = await Promise.all([
		admin.from('subscriptions').select('lesson_agreement_id, stripe_subscription_id, stripe_schedule_id'),
		admin.from('lesson_agreements').select('id, stripe_schedule_id').not('stripe_schedule_id', 'is', null),
	]);
	assertNoQueryError(subscriptionsRes.error);
	assertNoQueryError(agreementsRes.error);
	return mergeReconcileCandidates(subscriptionsRes.data || [], agreementsRes.data || []);
}

async function syncCandidateSubscription(
	admin: SupabaseClient,
	stripe: Stripe,
	candidate: ReconcileCandidate,
	stripeSubscriptionId: string,
): Promise<ReconcileItemOutcome> {
	const response = await syncSubscriptionFromStripe(admin, stripe, {
		stripeSubscriptionId,
		lessonAgreementIdHint: candidate.lessonAgreementId,
		scheduleIdFromDb: candidate.stripeScheduleId,
	});
	const body = (await response.json()) as { synced?: boolean; status?: string; error?: string };
	return mapSyncSubscriptionResponse(candidate.lessonAgreementId, response.ok, body, response.status);
}

async function reconcileScheduleOnly(
	admin: SupabaseClient,
	stripe: Stripe,
	candidate: ReconcileCandidate,
	scheduleId: string,
): Promise<ReconcileItemOutcome> {
	const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
	const action = classifyScheduleReconcileAction(schedule);
	if (action.kind === 'sync_subscription') {
		return syncCandidateSubscription(admin, stripe, candidate, action.stripeSubscriptionId);
	}
	if (action.kind === 'mark_canceled') {
		const { lessonAgreementId } = await applyCanceledScheduleLocally(admin, schedule);
		return {
			kind: 'canceled',
			lessonAgreementId: lessonAgreementId ?? candidate.lessonAgreementId,
		};
	}
	return {
		kind: 'skipped',
		lessonAgreementId: candidate.lessonAgreementId,
		reason: `Schedule status is ${action.status}; nog geen actief abonnement gekoppeld.`,
	};
}

async function reconcileOneCandidate(
	admin: SupabaseClient,
	stripe: Stripe,
	candidate: ReconcileCandidate,
): Promise<ReconcileItemOutcome> {
	try {
		if (candidate.stripeSubscriptionId) {
			return await syncCandidateSubscription(admin, stripe, candidate, candidate.stripeSubscriptionId);
		}
		if (candidate.stripeScheduleId) {
			return await reconcileScheduleOnly(admin, stripe, candidate, candidate.stripeScheduleId);
		}
		return {
			kind: 'skipped',
			lessonAgreementId: candidate.lessonAgreementId,
			reason: 'Geen Stripe-abonnement of schedule',
		};
	} catch (err) {
		return {
			kind: 'failed',
			lessonAgreementId: candidate.lessonAgreementId,
			error: getSafeErrorMessage(err, 'Reconcile mislukt'),
		};
	}
}

export async function runReconcileStripeMandates(admin: SupabaseClient, stripe: Stripe) {
	const candidates = await loadReconcileCandidates(admin);
	const results: ReconcileItemOutcome[] = [];
	for (const candidate of candidates) {
		results.push(await reconcileOneCandidate(admin, stripe, candidate));
	}
	return summarizeReconcileResults(results);
}
