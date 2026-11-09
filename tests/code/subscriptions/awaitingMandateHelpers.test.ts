import { describe, expect, it } from 'bun:test';
import {
	awaitingSentLabel,
	buildAwaitingMandateDisplayName,
	daysWaiting,
	hasArrangedMandate,
	isAwaitingMandate,
	mapAwaitingMandateRow,
	shouldShowAwaitingCounter,
	sortByLongestWaiting,
	unwrapJoinedName,
} from '../../../src/lib/subscriptions/awaitingMandateHelpers';

describe('awaitingMandateHelpers', () => {
	it('detects an arranged mandate from an open subscription with schedule id', () => {
		expect(
			hasArrangedMandate([{ status: 'active', stripe_schedule_id: 'sub_sched_1', stripe_subscription_id: null }]),
		).toBe(true);
	});

	it('treats canceled subscriptions as not arranged', () => {
		expect(
			hasArrangedMandate([
				{ status: 'canceled', stripe_schedule_id: 'sub_sched_1', stripe_subscription_id: 'sub_1' },
			]),
		).toBe(false);
	});

	it('marks active agreements without schedule as awaiting mandate', () => {
		expect(
			isAwaitingMandate(
				{
					isActive: true,
					endDate: null,
					stripeScheduleId: null,
					subscriptions: [],
				},
				'2026-10-30',
			),
		).toBe(true);
	});

	it('excludes ended or scheduled agreements from awaiting mandate', () => {
		expect(
			isAwaitingMandate(
				{
					isActive: true,
					endDate: '2026-09-01',
					stripeScheduleId: null,
					subscriptions: [],
				},
				'2026-10-30',
			),
		).toBe(false);
		expect(
			isAwaitingMandate(
				{
					isActive: true,
					endDate: null,
					stripeScheduleId: 'sub_sched_1',
					subscriptions: [],
				},
				'2026-10-30',
			),
		).toBe(false);
	});

	it('computes non-negative waiting days from a sent date', () => {
		expect(daysWaiting('2026-10-20T12:00:00Z', '2026-10-30')).toBe(10);
		expect(daysWaiting(null, '2026-10-30')).toBe(0);
	});

	it('sorts longest waiting first, then oldest start date', () => {
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

	it('hides the dashboard counter at zero', () => {
		expect(shouldShowAwaitingCounter(0)).toBe(false);
		expect(shouldShowAwaitingCounter(3)).toBe(true);
	});

	it('formats sent label and student display name', () => {
		expect(awaitingSentLabel('2026-10-20T10:00:00Z')).toBe('verstuurd op 20-10-2026');
		expect(awaitingSentLabel(null)).toBe('nog niet verstuurd');
		expect(buildAwaitingMandateDisplayName('Ada', 'Lovelace')).toBe('Ada Lovelace');
		expect(buildAwaitingMandateDisplayName(null, null)).toBeNull();
	});

	it('maps awaiting rows with invite and lesson type fallbacks', () => {
		expect(unwrapJoinedName(null)).toBe('Lessoort');
		expect(unwrapJoinedName([{ name: 'Piano' }])).toBe('Piano');
		expect(
			mapAwaitingMandateRow({
				lessonAgreementId: 'agr-1',
				studentUserId: 'stu-1',
				firstName: 'Ada',
				lastName: 'Lovelace',
				profileEmail: 'ada@ex.com',
				inviteEmail: 'ouder@ex.com',
				lessonType: { name: 'Piano' },
				startDate: '2026-09-01',
				createdAt: '2026-09-01T00:00:00Z',
				lastSentAt: '2026-10-20T00:00:00Z',
				today: '2026-10-30',
			}),
		).toEqual({
			lesson_agreement_id: 'agr-1',
			student_user_id: 'stu-1',
			student_name: 'Ada Lovelace',
			recipient_email: 'ouder@ex.com',
			lesson_type_name: 'Piano',
			start_date: '2026-09-01',
			created_at: '2026-09-01T00:00:00Z',
			last_sent_at: '2026-10-20T00:00:00Z',
			days_waiting: 10,
		});
	});
});
