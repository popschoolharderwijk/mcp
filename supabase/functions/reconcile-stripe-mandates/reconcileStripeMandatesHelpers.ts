import { isTerminalScheduleStatus, resolveStripeSubscriptionId } from '../_shared/billingHelpers.ts';

export type ReconcileCandidate = {
	lessonAgreementId: string;
	stripeSubscriptionId: string | null;
	stripeScheduleId: string | null;
};

export type ReconcileItemOutcome =
	| { kind: 'synced'; lessonAgreementId: string; status: string }
	| { kind: 'canceled'; lessonAgreementId: string }
	| { kind: 'skipped'; lessonAgreementId: string; reason: string }
	| { kind: 'failed'; lessonAgreementId: string; error: string };

export type ReconcileSummary = {
	checked: number;
	synced: number;
	canceled: number;
	skipped: number;
	failed: number;
	results: ReconcileItemOutcome[];
};

export type ScheduleReconcileAction =
	| { kind: 'sync_subscription'; stripeSubscriptionId: string }
	| { kind: 'mark_canceled' }
	| { kind: 'pending'; status: string };

export function mergeReconcileCandidates(
	fromSubscriptions: ReadonlyArray<{
		lesson_agreement_id: string;
		stripe_subscription_id: string | null;
		stripe_schedule_id: string | null;
	}>,
	fromAgreements: ReadonlyArray<{ id: string; stripe_schedule_id: string | null }>,
): ReconcileCandidate[] {
	const byAgreement = new Map<string, ReconcileCandidate>();
	for (const row of fromSubscriptions) {
		if (!row.stripe_subscription_id && !row.stripe_schedule_id) continue;
		byAgreement.set(row.lesson_agreement_id, {
			lessonAgreementId: row.lesson_agreement_id,
			stripeSubscriptionId: row.stripe_subscription_id,
			stripeScheduleId: row.stripe_schedule_id,
		});
	}
	for (const row of fromAgreements) {
		if (!row.stripe_schedule_id) continue;
		const existing = byAgreement.get(row.id);
		if (existing) {
			if (!existing.stripeScheduleId) existing.stripeScheduleId = row.stripe_schedule_id;
			continue;
		}
		byAgreement.set(row.id, {
			lessonAgreementId: row.id,
			stripeSubscriptionId: null,
			stripeScheduleId: row.stripe_schedule_id,
		});
	}
	return [...byAgreement.values()].sort((a, b) => a.lessonAgreementId.localeCompare(b.lessonAgreementId));
}

export function classifyScheduleReconcileAction(schedule: {
	status: string;
	subscription?: string | { id?: string } | null;
	released_subscription?: string | { id?: string } | null;
}): ScheduleReconcileAction {
	const subscriptionId =
		resolveStripeSubscriptionId(schedule.subscription) ??
		resolveStripeSubscriptionId(schedule.released_subscription);
	if (subscriptionId) return { kind: 'sync_subscription', stripeSubscriptionId: subscriptionId };
	if (isTerminalScheduleStatus(schedule.status)) return { kind: 'mark_canceled' };
	return { kind: 'pending', status: schedule.status };
}

export function summarizeReconcileResults(results: ReadonlyArray<ReconcileItemOutcome>): ReconcileSummary {
	let synced = 0;
	let canceled = 0;
	let skipped = 0;
	let failed = 0;
	for (const result of results) {
		if (result.kind === 'synced') synced += 1;
		else if (result.kind === 'canceled') canceled += 1;
		else if (result.kind === 'skipped') skipped += 1;
		else failed += 1;
	}
	return {
		checked: results.length,
		synced,
		canceled,
		skipped,
		failed,
		results: [...results],
	};
}

export function mapSyncSubscriptionResponse(
	lessonAgreementId: string,
	responseOk: boolean,
	body: { synced?: boolean; status?: string; error?: string },
	httpStatus: number,
): ReconcileItemOutcome {
	if (responseOk && body.synced) {
		return {
			kind: 'synced',
			lessonAgreementId,
			status: body.status ?? 'unknown',
		};
	}
	return {
		kind: 'failed',
		lessonAgreementId,
		error: body.error ?? `HTTP ${httpStatus}`,
	};
}
