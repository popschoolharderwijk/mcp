import { differenceInCalendarDays, parseISO } from 'date-fns';
import { formatDbDateToUi } from '@/lib/date/date-format';
import type { UserOptional } from '@/types/users';

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
function hasCollectableMandate(subscriptions: ReadonlyArray<AwaitingMandateSubscriptionRef>): boolean {
	return subscriptions.some(
		(s) =>
			OPEN_SUBSCRIPTION_STATUSES.has(s.status ?? '') && Boolean(s.stripe_schedule_id || s.stripe_subscription_id),
	);
}

/** True when Stripe already has a schedule or subscription id for this agreement. */
function hasMandateRecord(
	stripeScheduleId: string | null | undefined,
	subscriptions: ReadonlyArray<AwaitingMandateSubscriptionRef>,
): boolean {
	if (stripeScheduleId) return true;
	return subscriptions.some((s) => Boolean(s.stripe_schedule_id || s.stripe_subscription_id));
}

/**
 * Active agreement waiting on a Stripe mandate: no schedule on the agreement
 * and no prior mandate history (including canceled).
 */
export function isAwaitingMandate(input: AwaitingMandateInput, today: string): boolean {
	if (!input.isActive) return false;
	if (input.endDate && input.endDate < today) return false;
	if (input.stripeScheduleId) return false;
	if (hasMandateRecord(null, input.subscriptions)) return false;
	return !hasCollectableMandate(input.subscriptions);
}

export type MandateLifecycleStatus = 'pending' | 'active' | 'canceled';

/**
 * Maps local agreement/subscription state onto Stripe Mandate lifecycle buckets.
 * pending = not yet usable; active = can collect; canceled = revoked/unusable history.
 */
export function resolveMandateLifecycleStatus(
	input: AwaitingMandateInput,
	today: string,
): MandateLifecycleStatus | null {
	if (isAwaitingMandate(input, today)) return 'pending';
	if (!hasMandateRecord(input.stripeScheduleId, input.subscriptions)) return null;
	if (hasCollectableMandate(input.subscriptions)) return 'active';
	const agreementOpen = input.isActive && !(input.endDate && input.endDate < today);
	if (input.stripeScheduleId && agreementOpen) return 'active';
	return 'canceled';
}

export function pickPrimarySubscriptionStatus(
	subscriptions: ReadonlyArray<AwaitingMandateSubscriptionRef>,
): string | null {
	const open = subscriptions.find(
		(s) =>
			OPEN_SUBSCRIPTION_STATUSES.has(s.status ?? '') && Boolean(s.stripe_schedule_id || s.stripe_subscription_id),
	);
	if (open?.status) return open.status;
	const any = subscriptions.find((s) => Boolean(s.stripe_schedule_id || s.stripe_subscription_id));
	return any?.status ?? null;
}

export interface MandateStatusRow {
	lesson_agreement_id: string;
	student_user_id: string;
	student: AwaitingMandateStudent;
	lesson_type_name: string;
	start_date: string;
	agreement_active: boolean;
	subscription_status: string | null;
	lifecycle_status: 'active' | 'canceled';
}

export function mapMandateStatusRow(input: {
	lessonAgreementId: string;
	studentUserId: string;
	firstName: string | null | undefined;
	lastName: string | null | undefined;
	profileEmail: string | null | undefined;
	avatarUrl: string | null | undefined;
	lessonType: { name: string } | { name: string }[] | null | undefined;
	startDate: string;
	agreementActive: boolean;
	subscriptionStatus: string | null;
	lifecycleStatus: 'active' | 'canceled';
}): MandateStatusRow {
	return {
		lesson_agreement_id: input.lessonAgreementId,
		student_user_id: input.studentUserId,
		student: {
			user_id: input.studentUserId,
			first_name: input.firstName ?? null,
			last_name: input.lastName ?? null,
			email: input.profileEmail ?? null,
			avatar_url: input.avatarUrl ?? null,
		},
		lesson_type_name: unwrapJoinedName(input.lessonType),
		start_date: input.startDate,
		agreement_active: input.agreementActive,
		subscription_status: input.subscriptionStatus,
		lifecycle_status: input.lifecycleStatus,
	};
}

/** Shape a canceled mandate row for the shared payment-invite dialog. */
export function mandateStatusRowToInviteTarget(row: MandateStatusRow): AwaitingMandateRow {
	return {
		lesson_agreement_id: row.lesson_agreement_id,
		student_user_id: row.student_user_id,
		student: row.student,
		recipient_email: row.student.email ?? null,
		lesson_type_name: row.lesson_type_name,
		start_date: row.start_date,
		created_at: row.start_date,
		last_sent_at: null,
		days_waiting: 0,
	};
}

export function sortMandateStatusRows<T extends { agreement_active: boolean; start_date: string }>(
	rows: readonly T[],
): T[] {
	return [...rows].sort(
		(a, b) => Number(b.agreement_active) - Number(a.agreement_active) || b.start_date.localeCompare(a.start_date),
	);
}

export function daysWaiting(since: string | null | undefined, today: string): number {
	if (!since) return 0;
	const days = differenceInCalendarDays(parseISO(today), parseISO(since.slice(0, 10)));
	return Math.max(0, days);
}

export function sortByLongestWaiting<T extends { days_waiting: number; start_date: string }>(rows: readonly T[]): T[] {
	return [...rows].sort((a, b) => b.days_waiting - a.days_waiting || a.start_date.localeCompare(b.start_date));
}

/** Split agreements that still need a mandate into invite-not-sent vs invite-sent (awaiting). */
export function filterAwaitingByInviteSent<T extends { last_sent_at: string | null }>(
	rows: readonly T[],
	inviteSent: boolean,
): T[] {
	return rows.filter((row) => Boolean(row.last_sent_at) === inviteSent);
}

export function awaitingSentLabel(lastSentAt: string | null | undefined): string {
	return lastSentAt ? `verstuurd op ${formatDbDateToUi(lastSentAt.slice(0, 10))}` : 'nog niet verstuurd';
}

export interface AwaitingMandateStudent extends UserOptional {
	user_id: string;
}

export interface AwaitingMandateRow {
	lesson_agreement_id: string;
	student_user_id: string;
	student: AwaitingMandateStudent;
	recipient_email: string | null;
	lesson_type_name: string;
	start_date: string;
	created_at: string;
	last_sent_at: string | null;
	days_waiting: number;
}

function unwrapJoinedName(value: { name: string } | { name: string }[] | null | undefined): string {
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
	avatarUrl: string | null | undefined;
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
		student: {
			user_id: input.studentUserId,
			first_name: input.firstName ?? null,
			last_name: input.lastName ?? null,
			email: input.profileEmail ?? null,
			avatar_url: input.avatarUrl ?? null,
		},
		recipient_email: input.inviteEmail ?? input.profileEmail ?? null,
		lesson_type_name: unwrapJoinedName(input.lessonType),
		start_date: input.startDate,
		created_at: input.createdAt,
		last_sent_at: input.lastSentAt ?? null,
		days_waiting: daysWaiting(since, input.today),
	};
}
