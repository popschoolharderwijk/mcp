const ALLOWED_SUBSCRIPTION_STATUSES = new Set([
	'trialing',
	'active',
	'past_due',
	'canceled',
	'unpaid',
	'incomplete',
	'incomplete_expired',
	'paused',
]);

export function normalizeSubscriptionStatus(status: string): string {
	return ALLOWED_SUBSCRIPTION_STATUSES.has(status) ? status : 'incomplete';
}

export function stripeTimestampToIso(unixSeconds: number | null | undefined): string | null {
	if (unixSeconds == null) return null;
	return new Date(unixSeconds * 1000).toISOString();
}

export interface StripeSubscriptionLike {
	id: string;
	status: string;
	metadata?: { lesson_agreement_id?: string };
	customer: string | { id: string };
	schedule?: string | { id: string } | null;
	cancel_at?: number | null;
	canceled_at?: number | null;
	current_period_start?: number | null;
	current_period_end?: number | null;
	default_payment_method?: string | { type?: string } | null;
	latest_invoice?: string | { id?: string } | null;
	items: {
		data: Array<{
			price?: { id?: string } | null;
			current_period_start?: number | null;
			current_period_end?: number | null;
		}>;
	};
}

export interface SubscriptionStatePayload {
	lesson_agreement_id: string;
	stripe_customer_id: string;
	stripe_subscription_id: string;
	stripe_price_id: string;
	stripe_schedule_id: string | null;
	status: string;
	current_period_start: string | null;
	current_period_end: string | null;
	cancel_at: string | null;
	canceled_at: string | null;
	default_payment_method_brand: string | null;
	latest_invoice_id: string | null;
}

export function subscriptionToState(sub: StripeSubscriptionLike): SubscriptionStatePayload | null {
	const lessonAgreementId = sub.metadata?.lesson_agreement_id;
	if (!lessonAgreementId) return null;

	const firstItem = sub.items.data[0];
	const defaultPaymentMethod = sub.default_payment_method;
	const pmBrand =
		typeof defaultPaymentMethod === 'object' && defaultPaymentMethod ? (defaultPaymentMethod.type ?? null) : null;

	return {
		lesson_agreement_id: lessonAgreementId,
		stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
		stripe_subscription_id: sub.id,
		stripe_price_id: firstItem?.price?.id ?? '',
		stripe_schedule_id: typeof sub.schedule === 'string' ? sub.schedule : (sub.schedule?.id ?? null),
		status: normalizeSubscriptionStatus(sub.status),
		current_period_start: stripeTimestampToIso(sub.current_period_start ?? firstItem?.current_period_start),
		current_period_end: stripeTimestampToIso(sub.current_period_end ?? firstItem?.current_period_end),
		cancel_at: stripeTimestampToIso(sub.cancel_at),
		canceled_at: stripeTimestampToIso(sub.canceled_at),
		default_payment_method_brand: pmBrand,
		latest_invoice_id:
			typeof sub.latest_invoice === 'string' ? sub.latest_invoice : (sub.latest_invoice?.id ?? null),
	};
}
