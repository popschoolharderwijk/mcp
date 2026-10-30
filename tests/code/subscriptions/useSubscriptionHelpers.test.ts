import { describe, expect, it } from 'bun:test';
import { pickSubscriptionSnapshot } from '../../../src/hooks/useSubscription';
import type { SubscriptionRow } from '../../../src/types/subscriptions';

const base = {
	id: 'sub-1',
	lesson_agreement_id: 'agr-1',
	stripe_subscription_id: null,
	stripe_schedule_id: null,
	status: 'incomplete',
	current_period_end: null,
} as SubscriptionRow;

describe('pickSubscriptionSnapshot', () => {
	it('marks awaiting mandate when no schedule or subscription id', () => {
		expect(pickSubscriptionSnapshot([base], '2026-10-01T00:00:00Z')).toEqual({
			subscription: base,
			lastInviteAt: '2026-10-01T00:00:00Z',
			awaitingMandate: true,
		});
	});

	it('clears awaiting mandate when a schedule exists', () => {
		const arranged = { ...base, stripe_schedule_id: 'sch_1' };
		expect(pickSubscriptionSnapshot([arranged], null).awaitingMandate).toBe(false);
		expect(pickSubscriptionSnapshot(null, null)).toEqual({
			subscription: null,
			lastInviteAt: null,
			awaitingMandate: true,
		});
	});
});
