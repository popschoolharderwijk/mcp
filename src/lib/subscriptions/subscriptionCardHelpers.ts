import { getInvokeErrorMessage } from '@/lib/auth/invokeError';
import {
	SUBSCRIPTION_STATUS_LABELS,
	SUBSCRIPTION_STATUS_VARIANTS,
	type SubscriptionStatus,
} from '@/types/subscriptions';

export type SubscriptionAction = 'send-invite' | 'open-portal' | 'rebuild' | 'sync';

export const SUBSCRIPTION_ACTION_FUNCTIONS: Record<SubscriptionAction, string> = {
	'send-invite': 'issue-payment-link',
	'open-portal': 'create-customer-portal',
	rebuild: 'rebuild-subscription-schedule',
	sync: 'sync-stripe-subscription',
};

const ACTION_FALLBACK_ERRORS: Record<SubscriptionAction, string> = {
	'send-invite': 'Kon de betaaluitnodiging niet versturen',
	'open-portal': 'Kon het klantportaal niet openen',
	rebuild: 'Kon de nieuwe tarieven niet toepassen',
	sync: 'Kon niet synchroniseren met Stripe',
};

export function buildIssuePaymentLinkBody(
	lessonAgreementId: string,
	recipientEmail?: string,
	options?: { notifyTeacher?: boolean },
): Record<string, unknown> {
	const trimmed = recipientEmail?.trim();
	return {
		lesson_agreement_id: lessonAgreementId,
		...(trimmed ? { recipient_email: trimmed } : {}),
		...(options?.notifyTeacher ? { notify_teacher: true } : {}),
	};
}

export function buildSubscriptionActionBody(
	action: SubscriptionAction,
	lessonAgreementId: string,
	studentUserId: string,
	returnUrl: string,
): Record<string, unknown> {
	if (action === 'open-portal') return { user_id: studentUserId, return_url: returnUrl };
	if (action === 'send-invite') return buildIssuePaymentLinkBody(lessonAgreementId);
	return { lesson_agreement_id: lessonAgreementId };
}

export function resolveIssuedPaymentUrl(data: unknown): string | null {
	const url = (data as { payment_url?: unknown } | null)?.payment_url;
	if (typeof url !== 'string' || url.length === 0) return null;
	return url;
}

export function shouldShowResendInvitation(
	subscription:
		| {
				status?: string | null;
				stripe_schedule_id?: string | null;
				stripe_subscription_id?: string | null;
		  }
		| null
		| undefined,
): boolean {
	if (!subscription) return true;
	if (subscription.stripe_schedule_id) return false;
	if (subscription.status === 'canceled') return true;
	return !subscription.stripe_subscription_id;
}

export function shouldShowResendAction(
	loading: boolean,
	subscription:
		| {
				status?: string | null;
				stripe_schedule_id?: string | null;
				stripe_subscription_id?: string | null;
		  }
		| null
		| undefined,
): boolean {
	if (loading) return false;
	return shouldShowResendInvitation(subscription);
}

export function isPortalActionDisabled(
	busy: boolean,
	subscription: { stripe_schedule_id?: string | null } | null | undefined,
): boolean {
	return busy || !subscription;
}

export function isRebuildActionDisabled(
	busy: boolean,
	subscription: { stripe_schedule_id?: string | null } | null | undefined,
): boolean {
	if (busy) return true;
	return !subscription?.stripe_schedule_id;
}

export function subscriptionPeriodEndDay(
	subscription: { current_period_end?: string | null } | null | undefined,
): string | null {
	const raw = subscription?.current_period_end;
	if (!raw) return null;
	return raw.slice(0, 10);
}

export function subscriptionInviteSentDay(
	lastInviteAt: string | null | undefined,
	awaitingMandate: boolean,
): string | null {
	if (awaitingMandate) return null;
	if (!lastInviteAt) return null;
	return lastInviteAt.slice(0, 10);
}

export function resolveSubscriptionActionError(
	action: SubscriptionAction,
	data: unknown,
	error: unknown,
): string | null {
	const dataError = (data as { error?: unknown } | null)?.error;
	if (typeof dataError === 'string') return dataError;
	if (error) return ACTION_FALLBACK_ERRORS[action];
	return null;
}

/** Transport/server error (incl. FunctionsHttpError body), or 200 without `sent: true`. */
export async function resolveIssuePaymentLinkSendError(data: unknown, error: unknown): Promise<string | null> {
	const dataError = (data as { error?: unknown } | null)?.error;
	if (typeof dataError === 'string') return dataError;
	if (error) {
		return getInvokeErrorMessage(error, { fallback: ACTION_FALLBACK_ERRORS['send-invite'] });
	}
	if ((data as { sent?: unknown } | null)?.sent !== true) {
		return ACTION_FALLBACK_ERRORS['send-invite'];
	}
	return null;
}

export function resolveSubscriptionActionSuccess(action: SubscriptionAction, data: unknown): string {
	const payload = (data ?? {}) as {
		recipient?: string;
		status?: string;
		synced?: boolean;
		results?: Array<{ detail?: { updatedPhases?: number } }>;
	};
	switch (action) {
		case 'send-invite':
			return payload.recipient
				? `Betaaluitnodiging verstuurd naar ${payload.recipient}`
				: 'Betaaluitnodiging verstuurd';
		case 'rebuild': {
			const updated = payload.results?.[0]?.detail?.updatedPhases ?? 0;
			return updated > 0
				? `Nieuwe tarieven toegepast op ${updated} toekomstige maand(en)`
				: 'Geen toekomstige maanden om bij te werken';
		}
		case 'sync':
			return payload.synced
				? `Gesynchroniseerd met Stripe (status: ${payload.status ?? 'onbekend'})`
				: 'Stripe heeft nog geen actief abonnement';
		default:
			return 'Klaar';
	}
}

export type IssueAndOpenPayDecision =
	| { kind: 'ok'; url: string; successMessage: string }
	| { kind: 'error'; message: string };

/**
 * Staff “Open betaalscherm”: same as send-invite (mail + token), then open `/pay`.
 * Requires a successful issue payload with `payment_url`.
 */
export async function decideIssueAndOpenPay(data: unknown, error: unknown): Promise<IssueAndOpenPayDecision> {
	const sendError = await resolveIssuePaymentLinkSendError(data, error);
	if (sendError) return { kind: 'error', message: sendError };
	const url = resolveIssuedPaymentUrl(data);
	if (!url) return { kind: 'error', message: 'Geen betaallink-URL ontvangen' };
	return {
		kind: 'ok',
		url,
		successMessage: resolveSubscriptionActionSuccess('send-invite', data),
	};
}

export function extractPortalUrl(data: unknown): string | null {
	const url = (data as { url?: unknown } | null)?.url;
	return typeof url === 'string' ? url : null;
}

export function resolveSubscriptionStatusBadge(status: string | null | undefined): {
	label: string;
	variant: 'default' | 'secondary' | 'destructive' | 'outline';
} | null {
	if (!status || !(status in SUBSCRIPTION_STATUS_LABELS)) return null;
	const key = status as SubscriptionStatus;
	return { label: SUBSCRIPTION_STATUS_LABELS[key], variant: SUBSCRIPTION_STATUS_VARIANTS[key] };
}

export function shouldShowSubscriptionCard(isEditMode: boolean, isPrivileged: boolean): boolean {
	return isEditMode && isPrivileged;
}

export type SubscriptionActionOutcome =
	| { kind: 'error'; message: string }
	| { kind: 'portal'; url: string | null }
	| { kind: 'success'; message: string };

export async function resolveSubscriptionActionOutcome(
	action: SubscriptionAction,
	data: unknown,
	error: unknown,
): Promise<SubscriptionActionOutcome> {
	const message =
		action === 'send-invite'
			? await resolveIssuePaymentLinkSendError(data, error)
			: resolveSubscriptionActionError(action, data, error);
	if (message) return { kind: 'error', message };
	if (action === 'open-portal') return { kind: 'portal', url: extractPortalUrl(data) };
	return { kind: 'success', message: resolveSubscriptionActionSuccess(action, data) };
}
