import { describe, expect, it } from 'bun:test';
import {
	awaitingSentLabel,
	daysWaiting,
	isAwaitingMandate,
	resolveAwaitingRecipient,
	shouldShowAwaitingCounter,
	sortByLongestWaiting,
} from '@/lib/subscriptions/awaitingMandate';

const TODAY = '2026-10-21';
const base = {
	paymentMethod: 'stripe',
	isActive: true,
	endDate: null,
	billingKind: 'monthly',
	subscriptions: [],
};

describe('isAwaitingMandate', () => {
	it('waits for an active Stripe agreement without schedule', () => {
		expect(isAwaitingMandate(base, TODAY)).toBe(true);
	});
	it('never waits for agreements on invoice', () => {
		expect(isAwaitingMandate({ ...base, paymentMethod: 'manual' }, TODAY)).toBe(false);
	});
	it('stops waiting once a schedule or subscription exists', () => {
		const sched = { status: 'scheduled', stripe_schedule_id: 'sub_sched_1', stripe_subscription_id: null };
		expect(isAwaitingMandate({ ...base, subscriptions: [sched] }, TODAY)).toBe(false);
		const sub = { status: 'active', stripe_schedule_id: null, stripe_subscription_id: 'sub_1' };
		expect(isAwaitingMandate({ ...base, subscriptions: [sub] }, TODAY)).toBe(false);
	});
	it('keeps waiting when only a canceled or empty subscription row exists', () => {
		const canceled = { status: 'canceled', stripe_schedule_id: 'sub_sched_1', stripe_subscription_id: null };
		const empty = { status: 'incomplete', stripe_schedule_id: null, stripe_subscription_id: null };
		expect(isAwaitingMandate({ ...base, subscriptions: [canceled, empty] }, TODAY)).toBe(true);
	});
	it('skips one-off group lessons', () => {
		expect(isAwaitingMandate({ ...base, billingKind: 'one_off' }, TODAY)).toBe(false);
	});
	it('skips ended or inactive agreements', () => {
		expect(isAwaitingMandate({ ...base, endDate: '2026-10-20' }, TODAY)).toBe(false);
		expect(isAwaitingMandate({ ...base, endDate: '2026-10-21' }, TODAY)).toBe(true);
		expect(isAwaitingMandate({ ...base, isActive: false }, TODAY)).toBe(false);
	});
});

describe('daysWaiting', () => {
	it('counts calendar days and never goes negative', () => {
		expect(daysWaiting('2026-10-11T08:00:00+00:00', TODAY)).toBe(10);
		expect(daysWaiting('2026-10-21', TODAY)).toBe(0);
		expect(daysWaiting('2026-10-25', TODAY)).toBe(0);
		expect(daysWaiting(null, TODAY)).toBe(0);
	});
});

describe('sortByLongestWaiting', () => {
	it('puts the longest waiting first', () => {
		const rows = [
			{ id: 'a', days_waiting: 2, start_date: '2026-09-01' },
			{ id: 'b', days_waiting: 9, start_date: '2026-10-01' },
			{ id: 'c', days_waiting: 2, start_date: '2026-08-01' },
		];
		expect(sortByLongestWaiting(rows).map((r) => r.id)).toEqual(['b', 'c', 'a']);
	});
});

describe('resolveAwaitingRecipient', () => {
	it('prefers parent e-mail, then account', () => {
		expect(resolveAwaitingRecipient('ouder@x.nl', 'kind@x.nl')).toBe('ouder@x.nl');
		expect(resolveAwaitingRecipient('  ', 'kind@x.nl')).toBe('kind@x.nl');
		expect(resolveAwaitingRecipient(null, null)).toBeNull();
	});
});

describe('shouldShowAwaitingCounter', () => {
	it('hides at zero', () => {
		expect(shouldShowAwaitingCounter(0)).toBe(false);
		expect(shouldShowAwaitingCounter(null)).toBe(false);
		expect(shouldShowAwaitingCounter(3)).toBe(true);
	});
});

describe('awaitingSentLabel', () => {
	it('shows the date or not sent yet', () => {
		expect(awaitingSentLabel('2026-10-20T10:00:00Z')).toBe('verstuurd op 20-10-2026');
		expect(awaitingSentLabel(null)).toBe('nog niet verstuurd');
	});
});
