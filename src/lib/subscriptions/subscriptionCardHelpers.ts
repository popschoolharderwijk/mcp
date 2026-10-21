import {
	SUBSCRIPTION_STATUS_LABELS,
	SUBSCRIPTION_STATUS_VARIANTS,
	type SubscriptionStatus,
} from '@/types/subscriptions';

export type SubscriptionAction = 'send-invite' | 'open-portal' | 'rebuild' | 'sync' | 'force-start';

/** Edge function invoked per card action. */
export const SUBSCRIPTION_ACTION_FUNCTIONS: Record<SubscriptionAction, string> = {
	'send-invite': 'send-direct-debit-invite',
	'open-portal': 'create-customer-portal',
	rebuild: 'rebuild-subscription-schedule',
	sync: 'sync-stripe-subscription',
	'force-start': 'force-start-subscription',
};

const ACTION_FALLBACK_ERRORS: Record<SubscriptionAction, string> = {
	'send-invite': 'Kon de betaaluitnodiging niet versturen',
	'open-portal': 'Kon het klantportaal niet openen',
	rebuild: 'Kon de nieuwe tarieven niet toepassen',
	sync: 'Kon niet synchroniseren met Stripe',
	'force-start': 'Kon het abonnement niet direct starten',
};

export function buildSubscriptionActionBody(
	action: SubscriptionAction,
	lessonAgreementId: string,
	studentUserId: string,
	returnUrl: string,
): Record<string, string> {
	if (action === 'open-portal') return { user_id: studentUserId, return_url: returnUrl };
	return { lesson_agreement_id: lessonAgreementId };
}

export function shouldShowResendInvitation(
	subscription: { stripe_schedule_id?: string | null; stripe_subscription_id?: string | null } | null | undefined,
): boolean {
	return !subscription?.stripe_schedule_id && !subscription?.stripe_subscription_id;
}

export function resolveSubscriptionActionError(
	action: SubscriptionAction,
	data: unknown,
	error: { message?: string } | null,
): string | null {
	const dataError = (data as { error?: unknown } | null)?.error;
	if (typeof dataError === 'string') return dataError;
	if (error) return ACTION_FALLBACK_ERRORS[action];
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
		case 'force-start':
			return 'Abonnement direct gestart in Stripe';
		default:
			return 'Klaar';
	}
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

/** Only agreements saved with payment method Stripe show the subscription card. */
export function shouldShowSubscriptionCard(
	isEditMode: boolean,
	isPrivileged: boolean,
	savedPaymentMethod: string | null | undefined,
): boolean {
	return isEditMode && isPrivileged && savedPaymentMethod === 'stripe';
}
