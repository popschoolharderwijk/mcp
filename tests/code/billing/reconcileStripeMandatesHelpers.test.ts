import { describe, expect, it } from 'bun:test';
import {
	classifyScheduleReconcileAction,
	mapSyncSubscriptionResponse,
	mergeReconcileCandidates,
	summarizeReconcileResults,
} from '../../../supabase/functions/reconcile-stripe-mandates/reconcileStripeMandatesHelpers';

describe('mergeReconcileCandidates', () => {
	it('merges subscription rows and agreement schedule ids without duplicates', () => {
		expect(
			mergeReconcileCandidates(
				[
					{
						lesson_agreement_id: 'agr-2',
						stripe_subscription_id: 'sub_2',
						stripe_schedule_id: null,
					},
					{
						lesson_agreement_id: 'agr-1',
						stripe_subscription_id: null,
						stripe_schedule_id: 'sub_sched_1',
					},
				],
				[
					{ id: 'agr-1', stripe_schedule_id: 'sub_sched_1' },
					{ id: 'agr-3', stripe_schedule_id: 'sub_sched_3' },
				],
			),
		).toEqual([
			{
				lessonAgreementId: 'agr-1',
				stripeSubscriptionId: null,
				stripeScheduleId: 'sub_sched_1',
			},
			{
				lessonAgreementId: 'agr-2',
				stripeSubscriptionId: 'sub_2',
				stripeScheduleId: null,
			},
			{
				lessonAgreementId: 'agr-3',
				stripeSubscriptionId: null,
				stripeScheduleId: 'sub_sched_3',
			},
		]);
	});
});

describe('classifyScheduleReconcileAction', () => {
	it('prefers a linked subscription when present', () => {
		expect(
			classifyScheduleReconcileAction({
				status: 'active',
				subscription: 'sub_123',
			}),
		).toEqual({ kind: 'sync_subscription', stripeSubscriptionId: 'sub_123' });
	});

	it('marks terminal schedules without a subscription as canceled', () => {
		expect(classifyScheduleReconcileAction({ status: 'canceled', subscription: null })).toEqual({
			kind: 'mark_canceled',
		});
		expect(classifyScheduleReconcileAction({ status: 'released', released_subscription: null })).toEqual({
			kind: 'mark_canceled',
		});
	});

	it('skips non-terminal schedules that still wait for a subscription', () => {
		expect(classifyScheduleReconcileAction({ status: 'not_started', subscription: null })).toEqual({
			kind: 'pending',
			status: 'not_started',
		});
	});
});

describe('mapSyncSubscriptionResponse', () => {
	it('maps successful sync payloads and failed HTTP responses', () => {
		expect(mapSyncSubscriptionResponse('agr-1', true, { synced: true, status: 'active' }, 200)).toEqual({
			kind: 'synced',
			lessonAgreementId: 'agr-1',
			status: 'active',
		});
		expect(mapSyncSubscriptionResponse('agr-2', false, { error: 'boom' }, 500)).toEqual({
			kind: 'failed',
			lessonAgreementId: 'agr-2',
			error: 'boom',
		});
		expect(mapSyncSubscriptionResponse('agr-3', true, { synced: false }, 200)).toEqual({
			kind: 'failed',
			lessonAgreementId: 'agr-3',
			error: 'HTTP 200',
		});
	});
});

describe('summarizeReconcileResults', () => {
	it('counts synced, canceled, skipped, and failed outcomes', () => {
		expect(
			summarizeReconcileResults([
				{ kind: 'synced', lessonAgreementId: 'a', status: 'active' },
				{ kind: 'canceled', lessonAgreementId: 'b' },
				{ kind: 'skipped', lessonAgreementId: 'c', reason: 'pending' },
				{ kind: 'failed', lessonAgreementId: 'd', error: 'boom' },
				{ kind: 'synced', lessonAgreementId: 'e', status: 'canceled' },
			]),
		).toEqual({
			checked: 5,
			synced: 2,
			canceled: 1,
			skipped: 1,
			failed: 1,
			results: [
				{ kind: 'synced', lessonAgreementId: 'a', status: 'active' },
				{ kind: 'canceled', lessonAgreementId: 'b' },
				{ kind: 'skipped', lessonAgreementId: 'c', reason: 'pending' },
				{ kind: 'failed', lessonAgreementId: 'd', error: 'boom' },
				{ kind: 'synced', lessonAgreementId: 'e', status: 'canceled' },
			],
		});
	});
});
