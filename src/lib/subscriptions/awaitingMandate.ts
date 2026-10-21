import { differenceInCalendarDays, parseISO } from 'date-fns';
import { formatDbDateToUi } from '@/lib/date/date-format';

/** Statuses of a subscription that still counts as open (mirror of OPEN_SUBSCRIPTION_STATUSES). */
const OPEN_SUBSCRIPTION_STATUSES = new Set([
	'scheduled',
	'trialing',
	'active',
	'past_due',
	'unpaid',
	'incomplete',
	'paused',
]);

export interface AwaitingMandateInput {
	paymentMethod: string | null | undefined;
	isActive: boolean;
	endDate: string | null | undefined;
	billingKind: string | null | undefined;
	subscriptions: ReadonlyArray<{
		status: string | null;
		stripe_schedule_id: string | null;
		stripe_subscription_id: string | null;
	}>;
}

/** True when an open subscription already has a schedule or subscription in Stripe (= mandate given). */
export function hasArrangedMandate(subscriptions: AwaitingMandateInput['subscriptions']): boolean {
	return subscriptions.some(
		(s) =>
			OPEN_SUBSCRIPTION_STATUSES.has(s.status ?? '') && Boolean(s.stripe_schedule_id || s.stripe_subscription_id),
	);
}

/**
 * "Wacht op machtiging" (derived, never stored). Same rule as the SQL view
 * `agreements_awaiting_mandate`: Stripe, active and not ended, not one-off, no mandate yet.
 */
export function isAwaitingMandate(input: AwaitingMandateInput, today: string): boolean {
	if (input.paymentMethod !== 'stripe') return false;
	if (!input.isActive) return false;
	if (input.endDate && input.endDate < today) return false;
	if (input.billingKind === 'one_off') return false;
	return !hasArrangedMandate(input.subscriptions);
}

/** Whole days between the first invitation (or creation) and today, never negative. */
export function daysWaiting(since: string | null | undefined, today: string): number {
	if (!since) return 0;
	const days = differenceInCalendarDays(parseISO(today), parseISO(since.slice(0, 10)));
	return Math.max(0, days);
}

/** Recipient rule (mirror of resolveBillingRecipient): parent e-mail, else account e-mail. */
export function resolveAwaitingRecipient(
	parentEmail: string | null | undefined,
	accountEmail: string | null | undefined,
): string | null {
	return parentEmail?.trim() || accountEmail?.trim() || null;
}

/** Longest waiting first; ties by oldest start date. */
export function sortByLongestWaiting<T extends { days_waiting: number; start_date: string }>(rows: readonly T[]): T[] {
	return [...rows].sort((a, b) => b.days_waiting - a.days_waiting || a.start_date.localeCompare(b.start_date));
}

/** Dashboard counter is hidden when nobody is waiting. */
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
	first_sent_at: string | null;
	last_sent_at: string | null;
	days_waiting: number;
}

/** Logged-in payment page for one agreement (no token needed with a session). */
export function awaitingPaymentHref(agreementId: string): string {
	return `/direct-debit/start?agreement=${encodeURIComponent(agreementId)}`;
}
