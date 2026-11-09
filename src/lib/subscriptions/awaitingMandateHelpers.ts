import { differenceInCalendarDays, parseISO } from 'date-fns';
import { formatDbDateToUi } from '@/lib/date/date-format';

const OPEN_SUBSCRIPTION_STATUSES = new Set([
	'scheduled',
	'trialing',
	'active',
	'past_due',
	'unpaid',
	'incomplete',
	'paused',
]);

export interface AwaitingMandateSubscriptionRef {
	status: string | null;
	stripe_schedule_id: string | null;
	stripe_subscription_id: string | null;
}

export interface AwaitingMandateInput {
	isActive: boolean;
	endDate: string | null | undefined;
	stripeScheduleId: string | null | undefined;
	subscriptions: ReadonlyArray<AwaitingMandateSubscriptionRef>;
}

/** True when an open subscription already has a schedule or subscription in Stripe. */
export function hasArrangedMandate(subscriptions: ReadonlyArray<AwaitingMandateSubscriptionRef>): boolean {
	return subscriptions.some(
		(s) =>
			OPEN_SUBSCRIPTION_STATUSES.has(s.status ?? '') && Boolean(s.stripe_schedule_id || s.stripe_subscription_id),
	);
}

/**
 * Active agreement waiting on a Stripe mandate: no schedule on the agreement
 * and no open subscription with a schedule/subscription id.
 */
export function isAwaitingMandate(input: AwaitingMandateInput, today: string): boolean {
	if (!input.isActive) return false;
	if (input.endDate && input.endDate < today) return false;
	if (input.stripeScheduleId) return false;
	return !hasArrangedMandate(input.subscriptions);
}

export function daysWaiting(since: string | null | undefined, today: string): number {
	if (!since) return 0;
	const days = differenceInCalendarDays(parseISO(today), parseISO(since.slice(0, 10)));
	return Math.max(0, days);
}

export function sortByLongestWaiting<T extends { days_waiting: number; start_date: string }>(rows: readonly T[]): T[] {
	return [...rows].sort((a, b) => b.days_waiting - a.days_waiting || a.start_date.localeCompare(b.start_date));
}

export function shouldShowAwaitingCounter(count: number | null | undefined): boolean {
	return (count ?? 0) > 0;
}

export function awaitingSentLabel(lastSentAt: string | null | undefined): string {
	return lastSentAt ? `verstuurd op ${formatDbDateToUi(lastSentAt.slice(0, 10))}` : 'nog niet verstuurd';
}

export interface AwaitingMandateRow {
	lesson_agreement_id: string;
	student_user_id: string;
	student_name: string | null;
	recipient_email: string | null;
	lesson_type_name: string;
	start_date: string;
	created_at: string;
	last_sent_at: string | null;
	days_waiting: number;
}

export function buildAwaitingMandateDisplayName(
	firstName: string | null | undefined,
	lastName: string | null | undefined,
): string | null {
	const name = [firstName, lastName].filter(Boolean).join(' ').trim();
	return name || null;
}

export function unwrapJoinedName(value: { name: string } | { name: string }[] | null | undefined): string {
	if (!value) return 'Lessoort';
	const row = Array.isArray(value) ? value[0] : value;
	return row?.name ?? 'Lessoort';
}

export function mapAwaitingMandateRow(input: {
	lessonAgreementId: string;
	studentUserId: string;
	firstName: string | null | undefined;
	lastName: string | null | undefined;
	profileEmail: string | null | undefined;
	inviteEmail: string | null | undefined;
	lessonType: { name: string } | { name: string }[] | null | undefined;
	startDate: string;
	createdAt: string;
	lastSentAt: string | null | undefined;
	today: string;
}): AwaitingMandateRow {
	const since = input.lastSentAt ?? input.createdAt;
	return {
		lesson_agreement_id: input.lessonAgreementId,
		student_user_id: input.studentUserId,
		student_name: buildAwaitingMandateDisplayName(input.firstName, input.lastName),
		recipient_email: input.inviteEmail ?? input.profileEmail ?? null,
		lesson_type_name: unwrapJoinedName(input.lessonType),
		start_date: input.startDate,
		created_at: input.createdAt,
		last_sent_at: input.lastSentAt ?? null,
		days_waiting: daysWaiting(since, input.today),
	};
}
