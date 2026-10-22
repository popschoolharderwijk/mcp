export function canForceStartSchedule(status: string): boolean {
	return status === 'not_started' || status === 'active';
}

export function readScheduleBillingDetails(schedule: {
	customer: string | { id: string } | null;
	phases?: Array<{
		default_payment_method?: string | { id: string } | null;
		items?: Array<{ price?: string | { id: string } | null }>;
	}>;
}): {
	customerId: string | null;
	priceId: string | null;
	defaultPaymentMethod: string | undefined;
} {
	const firstPhase = schedule.phases?.[0];
	const firstItem = firstPhase?.items?.[0];
	const phaseDpm = firstPhase?.default_payment_method;

	return {
		customerId: readStripeId(schedule.customer),
		priceId: readStripeId(firstItem?.price),
		defaultPaymentMethod: (phaseDpm ? readStripeId(phaseDpm) : null) ?? undefined,
	};
}

function readStripeId(value: string | { id: string } | null | undefined): string | null {
	if (typeof value === 'string') return value;
	if (value && typeof value === 'object' && 'id' in value) return value.id;
	return null;
}
