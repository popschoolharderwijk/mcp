import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type Stripe from 'npm:stripe@17.5.0';
import { attachDefaultPaymentMethod, getReusablePaymentMethodIdFromSetupIntent, getStripeId } from './stripe.ts';
import { subscriptionToState } from './stripe-subscription-mapping.ts';
import {
	buildSubscriptionInvoiceUpsertRow,
	extractCheckoutSubscriptionId,
	extractStripeSubscriptionId,
	hasScheduleSetupInput,
	isScheduleSetupIntent,
	isStripeWebhookCheckoutAction,
	isStripeWebhookDataAction,
	resolveFirstInvoiceStatus,
	resolveSetupIntentId,
	resolveStripeWebhookAction,
	shouldHandleSubscriptionCheckout,
	shouldProcessSetupCheckoutSession,
} from './stripeWebhookHandlersPure.ts';
import { writeSubscriptionState } from './subscription-storage.ts';
import { findOpenSubscription, recordRebuildError, syncAgreementSchedule } from './subscriptionSchedule.ts';

async function hasExistingSchedule(admin: SupabaseClient, lessonAgreementId: string): Promise<boolean> {
	const existing = await findOpenSubscription(admin, lessonAgreementId);
	return Boolean(existing?.stripe_schedule_id);
}

async function createScheduleFromSetupPaymentMethod(
	admin: SupabaseClient,
	stripe: Stripe,
	input: {
		lessonAgreementId: string | null;
		customerId: string | null;
		paymentMethodId: string | null;
		sourceId: string;
	},
): Promise<void> {
	if (!hasScheduleSetupInput(input)) {
		console.warn('setup event missing agreement/customer/payment_method', input.sourceId);
		return;
	}

	if (await hasExistingSchedule(admin, input.lessonAgreementId)) {
		console.log('schedule already exists for agreement', input.lessonAgreementId);
		return;
	}

	try {
		await attachDefaultPaymentMethod(stripe, input.customerId, input.paymentMethodId);
	} catch (e) {
		console.error('attach payment method failed', e);
		return;
	}

	try {
		await syncAgreementSchedule(admin, stripe, {
			agreementId: input.lessonAgreementId,
			customerId: input.customerId,
			defaultPaymentMethod: input.paymentMethodId,
		});
	} catch (e) {
		console.error('creating catalog schedule failed', input.lessonAgreementId, e);
		await recordRebuildError(admin, input.lessonAgreementId, e);
	}
}

async function upsertSubscription(admin: SupabaseClient, sub: Stripe.Subscription): Promise<void> {
	const state = subscriptionToState(sub);
	if (!state) {
		console.warn('subscription without lesson_agreement_id metadata', sub.id);
		return;
	}
	await writeSubscriptionState(admin, state);
}

async function findInvoiceSubscriptionRowId(admin: SupabaseClient, inv: Stripe.Invoice): Promise<string | null> {
	const subId = extractStripeSubscriptionId(inv.subscription);
	if (subId) {
		const { data } = await admin
			.from('subscriptions')
			.select('id')
			.eq('stripe_subscription_id', subId)
			.maybeSingle();
		if (data) return data.id;
	}
	// First-month invoice is not attached to the subscription; it carries the agreement id.
	const agreementId = inv.metadata?.lesson_agreement_id;
	if (!agreementId) return null;
	const row = await findOpenSubscription(admin, agreementId);
	return row?.id ?? null;
}

async function updateFirstInvoiceStatus(admin: SupabaseClient, inv: Stripe.Invoice): Promise<void> {
	const status = resolveFirstInvoiceStatus(inv);
	if (!status) return;
	await admin.from('subscriptions').update({ first_invoice_status: status }).eq('first_invoice_stripe_id', inv.id);
}

async function upsertInvoice(admin: SupabaseClient, inv: Stripe.Invoice): Promise<void> {
	await updateFirstInvoiceStatus(admin, inv);
	const subRowId = await findInvoiceSubscriptionRowId(admin, inv);
	if (!subRowId) {
		console.warn('invoice for unknown subscription', inv.id);
		return;
	}
	const subRow = { id: subRowId };

	const { error } = await admin
		.from('subscription_invoices')
		.upsert(buildSubscriptionInvoiceUpsertRow(subRow.id, inv), {
			onConflict: 'stripe_invoice_id',
		});
	if (error) console.error('invoice upsert error', error);
}

async function handleSubscriptionCheckoutCompleted(
	admin: SupabaseClient,
	stripe: Stripe,
	session: Stripe.Checkout.Session,
): Promise<void> {
	const subId = extractCheckoutSubscriptionId(session.subscription);
	if (!subId) return;
	const sub = await stripe.subscriptions.retrieve(subId, { expand: ['default_payment_method'] });
	await upsertSubscription(admin, sub);
}

async function handleSetupCheckoutCompleted(
	admin: SupabaseClient,
	stripe: Stripe,
	session: Stripe.Checkout.Session,
): Promise<void> {
	if (!shouldProcessSetupCheckoutSession(session)) return;

	const paymentMethodId = await resolveSetupCheckoutPaymentMethodId(stripe, session.setup_intent);
	await createScheduleFromSetupPaymentMethod(admin, stripe, {
		lessonAgreementId: session.metadata?.lesson_agreement_id ?? null,
		customerId: getStripeId(session.customer),
		paymentMethodId,
		sourceId: session.id,
	});
}

async function resolveSetupCheckoutPaymentMethodId(
	stripe: Stripe,
	setupIntent: Stripe.Checkout.Session['setup_intent'],
): Promise<string | null> {
	const setupIntentId = resolveSetupIntentId(setupIntent);
	if (!setupIntentId) return null;
	const expandedSetupIntent = await stripe.setupIntents.retrieve(setupIntentId, { expand: ['latest_attempt'] });
	return getReusablePaymentMethodIdFromSetupIntent(expandedSetupIntent);
}

async function handleCheckoutSessionCompleted(
	admin: SupabaseClient,
	stripe: Stripe,
	session: Stripe.Checkout.Session,
): Promise<void> {
	if (shouldHandleSubscriptionCheckout(session)) {
		await handleSubscriptionCheckoutCompleted(admin, stripe, session);
		return;
	}
	await handleSetupCheckoutCompleted(admin, stripe, session);
}

async function handleSetupIntentSucceeded(
	admin: SupabaseClient,
	stripe: Stripe,
	setupIntent: Stripe.SetupIntent,
): Promise<void> {
	if (!isScheduleSetupIntent(setupIntent)) return;

	const expandedSetupIntent = await stripe.setupIntents.retrieve(setupIntent.id, {
		expand: ['latest_attempt'],
	});
	await createScheduleFromSetupPaymentMethod(admin, stripe, {
		lessonAgreementId: expandedSetupIntent.metadata.lesson_agreement_id ?? null,
		customerId: getStripeId(expandedSetupIntent.customer),
		paymentMethodId: getReusablePaymentMethodIdFromSetupIntent(expandedSetupIntent),
		sourceId: setupIntent.id,
	});
}

export async function handleStripeWebhookEvent(
	admin: SupabaseClient,
	stripe: Stripe,
	event: Stripe.Event,
): Promise<void> {
	const action = resolveStripeWebhookAction(event.type);
	if (action === 'noop') return;
	if (action === 'schedule_event') {
		await handleScheduleEvent(admin, event);
		return;
	}
	if (isStripeWebhookDataAction(action)) {
		await dispatchStripeWebhookDataAction(admin, stripe, event, action);
		return;
	}
	if (isStripeWebhookCheckoutAction(action)) {
		await dispatchStripeWebhookCheckoutAction(admin, stripe, event, action);
	}
}

async function dispatchStripeWebhookDataAction(
	admin: SupabaseClient,
	_stripe: Stripe,
	event: Stripe.Event,
	action: 'upsert_subscription' | 'upsert_invoice',
): Promise<void> {
	if (action === 'upsert_subscription') {
		await upsertSubscription(admin, event.data.object as Stripe.Subscription);
		return;
	}
	await upsertInvoice(admin, event.data.object as Stripe.Invoice);
}

async function dispatchStripeWebhookCheckoutAction(
	admin: SupabaseClient,
	stripe: Stripe,
	event: Stripe.Event,
	action: 'checkout_session_completed' | 'setup_intent_succeeded',
): Promise<void> {
	if (action === 'checkout_session_completed') {
		await handleCheckoutSessionCompleted(admin, stripe, event.data.object as Stripe.Checkout.Session);
		return;
	}
	await handleSetupIntentSucceeded(admin, stripe, event.data.object as Stripe.SetupIntent);
}

/** A released or cancelled schedule must be rebuilt by the daily task (never run on without a plan). */
async function handleScheduleEvent(admin: SupabaseClient, event: Stripe.Event): Promise<void> {
	const schedule = event.data.object as Stripe.SubscriptionSchedule;
	if (event.type !== 'subscription_schedule.released') return;
	console.warn('subscription schedule released', schedule.id);
	await admin.from('subscriptions').update({ needs_rebuild: true }).eq('stripe_schedule_id', schedule.id);
}
