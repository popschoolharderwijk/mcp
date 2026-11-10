import { describe, expect, it } from 'bun:test';
import {
	awaitingSentLabel,
	daysWaiting,
	mandateStatusRowToInviteTarget,
	mapAwaitingMandateRow,
	mapMandateStatusRow,
	pickPrimarySubscriptionStatus,
	resolveMandateLifecycleStatus,
	sortByLongestWaiting,
	sortMandateStatusRows,
} from '../../../src/lib/subscriptions/awaitingMandateHelpers';

describe('awaitingMandateHelpers', () => {
	it('maps agreement state onto pending, active, and canceled lifecycle buckets', () => {
		expect(
			resolveMandateLifecycleStatus(
				{
					isActive: true,
					endDate: null,
					stripeScheduleId: null,
					subscriptions: [],
				},
				'2026-10-30',
			),
		).toBe('pending');
		expect(
			resolveMandateLifecycleStatus(
				{
					isActive: true,
					endDate: '2026-09-01',
					stripeScheduleId: null,
					subscriptions: [],
				},
				'2026-10-30',
			),
		).toBeNull();
		expect(
			resolveMandateLifecycleStatus(
				{
					isActive: true,
					endDate: null,
					stripeScheduleId: 'sub_sched_1',
					subscriptions: [
						{ status: 'active', stripe_schedule_id: 'sub_sched_1', stripe_subscription_id: 'sub_1' },
					],
				},
				'2026-10-30',
			),
		).toBe('active');
		expect(
			resolveMandateLifecycleStatus(
				{
					isActive: true,
					endDate: null,
					stripeScheduleId: 'sub_sched_1',
					subscriptions: [
						{ status: 'scheduled', stripe_schedule_id: 'sub_sched_1', stripe_subscription_id: null },
					],
				},
				'2026-10-30',
			),
		).toBe('active');
		expect(
			resolveMandateLifecycleStatus(
				{
					isActive: true,
					endDate: null,
					stripeScheduleId: 'sub_sched_1',
					subscriptions: [],
				},
				'2026-10-30',
			),
		).toBe('active');
		expect(
			resolveMandateLifecycleStatus(
				{
					isActive: true,
					endDate: null,
					stripeScheduleId: null,
					subscriptions: [
						{ status: 'canceled', stripe_schedule_id: 'sub_sched_1', stripe_subscription_id: 'sub_1' },
					],
				},
				'2026-10-30',
			),
		).toBe('canceled');
		expect(
			resolveMandateLifecycleStatus(
				{
					isActive: false,
					endDate: null,
					stripeScheduleId: 'sub_sched_1',
					subscriptions: [
						{ status: 'canceled', stripe_schedule_id: 'sub_sched_1', stripe_subscription_id: 'sub_1' },
					],
				},
				'2026-10-30',
			),
		).toBeNull();
		expect(
			resolveMandateLifecycleStatus(
				{
					isActive: true,
					endDate: '2026-09-01',
					stripeScheduleId: null,
					subscriptions: [
						{ status: 'canceled', stripe_schedule_id: 'sub_sched_1', stripe_subscription_id: 'sub_1' },
					],
				},
				'2026-10-30',
			),
		).toBeNull();
	});

	it('prefers an open subscription status over canceled history', () => {
		expect(
			pickPrimarySubscriptionStatus([
				{ status: 'canceled', stripe_schedule_id: 's1', stripe_subscription_id: null },
				{ status: 'active', stripe_schedule_id: 's2', stripe_subscription_id: 'sub' },
			]),
		).toBe('active');
		expect(
			pickPrimarySubscriptionStatus([
				{ status: 'canceled', stripe_schedule_id: 's', stripe_subscription_id: null },
			]),
		).toBe('canceled');
	});

	it('sorts status rows by active agreement then newest start date', () => {
		expect(
			sortMandateStatusRows([
				{ agreement_active: false, start_date: '2026-10-01' },
				{ agreement_active: true, start_date: '2026-08-01' },
				{ agreement_active: true, start_date: '2026-09-01' },
			]),
		).toEqual([
			{ agreement_active: true, start_date: '2026-09-01' },
			{ agreement_active: true, start_date: '2026-08-01' },
			{ agreement_active: false, start_date: '2026-10-01' },
		]);
	});

	it('computes waiting days from a sent date and sorts longest wait first', () => {
		expect(daysWaiting('2026-10-20T12:00:00Z', '2026-10-30')).toBe(10);
		expect(daysWaiting(null, '2026-10-30')).toBe(0);
		expect(
			sortByLongestWaiting([
				{ days_waiting: 2, start_date: '2026-09-01' },
				{ days_waiting: 5, start_date: '2026-10-01' },
				{ days_waiting: 5, start_date: '2026-08-01' },
			]),
		).toEqual([
			{ days_waiting: 5, start_date: '2026-08-01' },
			{ days_waiting: 5, start_date: '2026-10-01' },
			{ days_waiting: 2, start_date: '2026-09-01' },
		]);
	});

	it('prefers invite email and computes waiting days from last send', () => {
		expect(awaitingSentLabel(null)).toBe('nog niet verstuurd');
		expect(awaitingSentLabel('2026-10-20T10:00:00Z')).toBe('verstuurd op 20-10-2026');
		const row = mapAwaitingMandateRow({
			lessonAgreementId: 'agr-1',
			studentUserId: 'stu-1',
			firstName: 'Ada',
			lastName: 'Lovelace',
			profileEmail: 'ada@ex.com',
			avatarUrl: null,
			inviteEmail: 'ouder@ex.com',
			lessonType: null,
			startDate: '2026-09-01',
			createdAt: '2026-09-01T00:00:00Z',
			lastSentAt: '2026-10-20T00:00:00Z',
			today: '2026-10-30',
		});
		expect(row.recipient_email).toBe('ouder@ex.com');
		expect(row.lesson_type_name).toBe('Lessoort');
		expect(row.days_waiting).toBe(10);
	});

	it('maps a canceled status row into the payment-invite dialog target', () => {
		const statusRow = mapMandateStatusRow({
			lessonAgreementId: 'agr-9',
			studentUserId: 'stu-9',
			firstName: 'Tess',
			lastName: 'Zee',
			profileEmail: 'tess@ex.com',
			avatarUrl: null,
			lessonType: { name: 'Piano' },
			startDate: '2026-01-01',
			agreementActive: true,
			subscriptionStatus: 'canceled',
			lifecycleStatus: 'canceled',
		});
		expect(mandateStatusRowToInviteTarget(statusRow)).toEqual({
			lesson_agreement_id: 'agr-9',
			student_user_id: 'stu-9',
			student: {
				user_id: 'stu-9',
				first_name: 'Tess',
				last_name: 'Zee',
				email: 'tess@ex.com',
				avatar_url: null,
			},
			recipient_email: 'tess@ex.com',
			lesson_type_name: 'Piano',
			start_date: '2026-01-01',
			created_at: '2026-01-01',
			last_sent_at: null,
			days_waiting: 0,
		});
	});
});
