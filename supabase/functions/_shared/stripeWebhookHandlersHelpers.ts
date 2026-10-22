export interface StripeInvoiceLike {
	id: string;
	amount_due: number;
	amount_paid: number;
	currency: string;
	status?: string | null;
	hosted_invoice_url?: string | null;
	invoice_pdf?: string | null;
	period_start?: number | null;
	period_end?: number | null;
	status_transitions?: { paid_at?: number | null } | null;
}

export function extractStripeSubscriptionId(subscription: string | { id: string } | null | undefined): string | null {
	if (typeof subscription === 'string') return subscription;
	return subscription?.id ?? null;
}

export function stripeUnixTimestampToIso(timestamp: number | null | undefined): string | null {
	return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

export function buildSubscriptionInvoiceUpsertRow(subscriptionId: string, invoice: StripeInvoiceLike) {
	return {
		subscription_id: subscriptionId,
		stripe_invoice_id: invoice.id,
		amount_due: invoice.amount_due,
		amount_paid: invoice.amount_paid,
		currency: invoice.currency,
		status: invoice.status ?? 'open',
		hosted_invoice_url: invoice.hosted_invoice_url,
		invoice_pdf: invoice.invoice_pdf,
		period_start: stripeUnixTimestampToIso(invoice.period_start),
		period_end: stripeUnixTimestampToIso(invoice.period_end),
		paid_at: stripeUnixTimestampToIso(invoice.status_transitions?.paid_at),
	};
}

export function isScheduleSetupCheckoutSession(session: {
	mode: string;
	metadata?: { flow?: string } | null;
}): boolean {
	return session.mode === 'setup' && session.metadata?.flow === 'schedule_setup';
}

export function isScheduleSetupIntent(setupIntent: { metadata?: { flow?: string } | null }): boolean {
	return setupIntent.metadata?.flow === 'schedule_setup';
}

export function hasScheduleSetupInput(input: {
	lessonAgreementId: string | null;
	customerId: string | null;
	paymentMethodId: string | null;
}): boolean {
	return Boolean(input.lessonAgreementId && input.customerId && input.paymentMethodId);
}

export type StripeWebhookAction =
	| 'upsert_subscription'
	| 'checkout_session_completed'
	| 'setup_intent_succeeded'
	| 'upsert_invoice'
	| 'noop';

export function resolveStripeWebhookAction(eventType: string): StripeWebhookAction {
	switch (eventType) {
		case 'customer.subscription.created':
		case 'customer.subscription.updated':
		case 'customer.subscription.deleted':
		case 'customer.subscription.paused':
		case 'customer.subscription.resumed':
			return 'upsert_subscription';
		case 'checkout.session.completed':
			return 'checkout_session_completed';
		case 'setup_intent.succeeded':
			return 'setup_intent_succeeded';
		case 'invoice.paid':
		case 'invoice.finalized':
		case 'invoice.payment_failed':
		case 'invoice.payment_succeeded':
			return 'upsert_invoice';
		default:
			return 'noop';
	}
}

export function extractCheckoutSubscriptionId(subscription: string | { id: string } | null | undefined): string | null {
	if (typeof subscription === 'string') return subscription;
	return subscription?.id ?? null;
}

export function shouldHandleSubscriptionCheckout(session: {
	mode: string;
	subscription: string | { id: string } | null | undefined;
}): boolean {
	return session.mode === 'subscription' && Boolean(extractCheckoutSubscriptionId(session.subscription));
}

export function resolveSetupIntentId(setupIntent: string | { id: string } | null | undefined): string | null {
	if (typeof setupIntent === 'string') return setupIntent;
	return setupIntent?.id ?? null;
}

export function shouldProcessSetupCheckoutSession(session: {
	mode: string;
	metadata?: { flow?: string } | null;
}): boolean {
	return session.mode === 'setup' && isScheduleSetupCheckoutSession(session);
}

export function isStripeWebhookDataAction(
	action: StripeWebhookAction,
): action is 'upsert_subscription' | 'upsert_invoice' {
	return action === 'upsert_subscription' || action === 'upsert_invoice';
}

export function isStripeWebhookCheckoutAction(
	action: StripeWebhookAction,
): action is 'checkout_session_completed' | 'setup_intent_succeeded' {
	return action === 'checkout_session_completed' || action === 'setup_intent_succeeded';
}
