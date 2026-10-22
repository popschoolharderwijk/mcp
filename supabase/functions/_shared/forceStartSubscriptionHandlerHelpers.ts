export function resolveForceStartAgreementNotFound(
	agreement: { id: string; stripe_schedule_id: string | null } | null,
	errorMessage: string | undefined,
): { status: number; error: string } | null {
	if (errorMessage || !agreement) {
		return { status: 404, error: 'Lesovereenkomst niet gevonden' };
	}
	return null;
}

export function resolveForceStartMissingSchedule(agreement: {
	stripe_schedule_id: string | null;
}): { status: number; error: string } | null {
	if (!agreement.stripe_schedule_id) {
		return { status: 400, error: 'Geen Stripe schedule gekoppeld aan deze lesovereenkomst' };
	}
	return null;
}

export function resolveForceStartScheduleStatusError(status: string): { status: number; error: string } | null {
	if (status === 'not_started' || status === 'active') return null;
	return { status: 400, error: `Schedule status is ${status}; kan niet geforceerd starten` };
}

export function resolveForceStartBillingErrors(billing: {
	customerId: string | null;
	priceId: string | null;
}): { status: number; error: string } | null {
	if (!billing.customerId) return { status: 400, error: 'Kon Stripe customer niet bepalen' };
	if (!billing.priceId) return { status: 400, error: 'Kon prijs uit schedule niet lezen' };
	return null;
}

export function resolveForceStartAgreementGate(
	agreement: { id: string; stripe_schedule_id: string | null } | null,
	errorMessage: string | undefined,
): { status: number; error: string } | null {
	const agreementError = resolveForceStartAgreementNotFound(agreement, errorMessage);
	if (agreementError) return agreementError;
	if (!agreement) return { status: 404, error: 'Lesovereenkomst niet gevonden' };
	return resolveForceStartMissingSchedule(agreement);
}

export function buildForceStartSuccessPayload(subscription: { id: string; status: string }) {
	return {
		ok: true as const,
		stripe_subscription_id: subscription.id,
		status: subscription.status,
	};
}
