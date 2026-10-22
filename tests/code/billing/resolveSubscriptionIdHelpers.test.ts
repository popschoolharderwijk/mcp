import { describe, expect, it } from 'bun:test';
import {
	buildPendingScheduleSyncInfo,
	buildResolvedSubscriptionFromRow,
	extractReleasedSubscriptionId,
	resolveDirectStripeSubscription,
} from '../../../supabase/functions/sync-stripe-subscription/resolveSubscriptionIdHelpers';

describe('resolveDirectStripeSubscription', () => {
	it('returns resolved subscription when stripe id is provided', () => {
		expect(
			resolveDirectStripeSubscription({
				stripeSubscriptionId: 'sub_123',
				lessonAgreementId: 'agr-1',
			}),
		).toEqual({
			ok: true,
			resolved: {
				stripeSubscriptionId: 'sub_123',
				scheduleIdFromDb: null,
				lessonAgreementIdHint: 'agr-1',
			},
		});
	});

	it('returns null when stripe id is missing', () => {
		expect(resolveDirectStripeSubscription({ lessonAgreementId: 'agr-1' })).toBeNull();
	});
});

describe('extractReleasedSubscriptionId', () => {
	it('prefers released_subscription when it is a string', () => {
		expect(
			extractReleasedSubscriptionId({
				released_subscription: 'sub_released',
				subscription: 'sub_active',
				status: 'released',
			}),
		).toBe('sub_released');
	});

	it('falls back to subscription when released_subscription is not a string', () => {
		expect(
			extractReleasedSubscriptionId({
				released_subscription: null,
				subscription: 'sub_active',
				status: 'active',
			}),
		).toBe('sub_active');
	});

	it('returns null when no subscription id is available', () => {
		expect(
			extractReleasedSubscriptionId({ released_subscription: null, subscription: null, status: 'not_started' }),
		).toBe(null);
	});
});

describe('buildPendingScheduleSyncInfo', () => {
	it('builds pending sync info from schedule status', () => {
		expect(buildPendingScheduleSyncInfo('not_started')).toEqual({
			synced: false,
			info: 'Schedule status is not_started; nog geen actief abonnement gekoppeld.',
			schedule_status: 'not_started',
		});
	});
});

describe('buildResolvedSubscriptionFromRow', () => {
	it('builds resolved subscription from db row and stripe id', () => {
		expect(
			buildResolvedSubscriptionFromRow(
				{ stripe_subscription_id: 'sub_db', stripe_schedule_id: 'sched_1' },
				'agr-1',
				'sub_final',
			),
		).toEqual({
			stripeSubscriptionId: 'sub_final',
			scheduleIdFromDb: 'sched_1',
			lessonAgreementIdHint: 'agr-1',
		});
	});
});
