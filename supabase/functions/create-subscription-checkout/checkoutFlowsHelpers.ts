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
	const defaultSuccessUrl = `${origin}/stripe/checkout/start?agreement=${agreementId}&session_id={CHECKOUT_SESSION_ID}`;
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

export function buildStripeCustomerDisplayName(firstName: string | null, lastName: string | null): string | undefined {
	const name = [firstName, lastName].filter(Boolean).join(' ');
	return name || undefined;
}

/** Webhook has not written `stripe_schedule_id` yet — client should poll. */
function buildCompleteModePendingResponse(): Response {
	return jsonResponse(200, { mode: 'complete', pending: true });
}

export type CompleteModeArrangement = 'not_complete' | 'pending' | 'ready';

/** Map Checkout session + local schedule id to complete-mode poll outcome. */
export function resolveCompleteModeArrangement(
	sessionStatus: string | null | undefined,
	scheduleId: string | null,
): CompleteModeArrangement {
	if (sessionStatus !== 'complete') return 'not_complete';
	if (scheduleId) return 'ready';
	return 'pending';
}

export function buildCompleteModeArrangementResponse(
	arrangement: CompleteModeArrangement,
	scheduleId: string | null,
): Response {
	if (arrangement === 'not_complete') {
		return jsonResponse(409, { error: 'Checkout is nog niet afgerond' });
	}
	if (arrangement === 'ready') {
		return buildCompleteModeSuccessResponse({ scheduleId: scheduleId as string });
	}
	return buildCompleteModePendingResponse();
}

export function buildCompleteModeSuccessResponse(built: {
	scheduleId: string;
	subscriptionId?: string | null;
}): Response {
	return jsonResponse(200, {
		mode: 'complete',
		pending: false,
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
