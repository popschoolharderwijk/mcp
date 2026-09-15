import { jsonResponse, resolveAllowedRedirectUrl } from '../_shared/http.ts';

export function validateCompleteCheckoutSessionId(checkoutSessionId: string | undefined): Response | null {
	if (!checkoutSessionId?.startsWith('cs_')) {
		return jsonResponse(400, { error: 'Ongeldige checkout sessie' });
	}
	return null;
}

export interface CompleteCheckoutSessionLike {
	mode: string;
	metadata?: { lesson_agreement_id?: string } | null;
}

export function validateCompleteCheckoutSessionMatch(
	session: CompleteCheckoutSessionLike,
	agreementId: string,
): Response | null {
	if (session.mode !== 'setup' || session.metadata?.lesson_agreement_id !== agreementId) {
		return jsonResponse(409, { error: 'Checkout sessie hoort niet bij deze lesovereenkomst' });
	}
	return null;
}

export function resolveDirectModePaymentMethodId(defaultPm: string | { id: string } | null | undefined): string | null {
	if (typeof defaultPm === 'string') return defaultPm;
	return defaultPm?.id ?? null;
}

export type CheckoutSessionUrlsResult =
	| { ok: true; successUrl: string; cancelUrl: string }
	| { ok: false; error: string };

export function buildCheckoutSessionUrls(
	origin: string,
	agreementId: string,
	body: { success_url?: string; cancel_url?: string },
): CheckoutSessionUrlsResult {
	const defaultSuccessUrl = `${origin}/incasso/start?agreement=${agreementId}&session_id={CHECKOUT_SESSION_ID}`;
	const defaultCancelUrl = `${origin}/agreements/${agreementId}?subscription=canceled`;

	const allowedSuccessUrl = body.success_url ? resolveAllowedRedirectUrl(body.success_url) : null;
	if (body.success_url && !allowedSuccessUrl) return { ok: false, error: 'Ongeldige success_url' };

	const allowedCancelUrl = body.cancel_url ? resolveAllowedRedirectUrl(body.cancel_url) : null;
	if (body.cancel_url && !allowedCancelUrl) return { ok: false, error: 'Ongeldige cancel_url' };

	return {
		ok: true,
		successUrl: allowedSuccessUrl ?? defaultSuccessUrl,
		cancelUrl: allowedCancelUrl ?? defaultCancelUrl,
	};
}

export function resolveExistingScheduleResponse(scheduleId: string | null | undefined): Response | null {
	if (!scheduleId) return null;
	return jsonResponse(200, { mode: 'complete', schedule_id: scheduleId });
}

export function validateCompleteModePaymentReady(
	customerId: string | null,
	paymentMethodId: string | null,
): Response | null {
	if (!customerId || !paymentMethodId) {
		return jsonResponse(409, { error: 'Betaalmethode is nog niet beschikbaar in Stripe' });
	}
	return null;
}

export function buildStripeCustomerDisplayName(firstName: string | null, lastName: string | null): string | undefined {
	const name = [firstName, lastName].filter(Boolean).join(' ');
	return name || undefined;
}

export function buildCompleteModeSuccessResponse(built: {
	scheduleId: string;
	subscriptionId?: string | null;
}): Response {
	return jsonResponse(200, {
		mode: 'complete',
		schedule_id: built.scheduleId,
		subscription_id: built.subscriptionId,
	});
}

export function buildDirectModeSuccessResponse(built: {
	scheduleId: string;
	subscriptionId?: string | null;
	yearly: { yearlyCents: number; monthlyCents: number; lessonsCount: number };
	periodStart: string;
	periodEnd: string;
	tariff: unknown;
}): Response {
	return jsonResponse(200, {
		mode: 'direct',
		schedule_id: built.scheduleId,
		subscription_id: built.subscriptionId,
		yearly_cents: built.yearly.yearlyCents,
		monthly_cents: built.yearly.monthlyCents,
		lessons_count: built.yearly.lessonsCount,
		period: { start: built.periodStart, end: built.periodEnd },
		tariff: built.tariff,
	});
}

export function resolveSetupIntentPaymentMethodId<T extends { id?: string }>(
	setupIntent: string | T | null | undefined,
	extractPaymentMethodId: (intent: T) => string | null,
): string | null {
	if (typeof setupIntent !== 'object' || !setupIntent) return null;
	return extractPaymentMethodId(setupIntent);
}
