import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type Stripe from 'npm:stripe@17.5.0';
import { createScheduleForAgreement } from './billing.ts';
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
	resolveSetupIntentId,
	resolveStripeWebhookAction,
	shouldHandleSubscriptionCheckout,
	shouldProcessSetupCheckoutSession,
} from './stripeWebhookHandlersPure.ts';
import { writeSubscriptionState } from './subscription-storage.ts';

async function hasExistingSchedule(admin: SupabaseClient, lessonAgreementId: string): Promise<boolean> {
	const { data } = await admin
		.from('lesson_agreements')
		.select('stripe_schedule_id')
		.eq('id', lessonAgreementId)
		.maybeSingle();
	return Boolean(data?.stripe_schedule_id);
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

	await createScheduleForAgreement(admin, stripe, {
		lessonAgreementId: input.lessonAgreementId,
		customerId: input.customerId,
		defaultPaymentMethod: input.paymentMethodId,
	});
}

async function upsertSubscription(admin: SupabaseClient, sub: Stripe.Subscription): Promise<void> {
	const state = subscriptionToState(sub);
	if (!state) {
		console.warn('subscription without lesson_agreement_id metadata', sub.id);
		return;
	}
	await writeSubscriptionState(admin, state);
}

async function upsertInvoice(admin: SupabaseClient, inv: Stripe.Invoice): Promise<void> {
	const subId = extractStripeSubscriptionId(inv.subscription);
	if (!subId) return;

	const { data: subRow } = await admin
		.from('subscriptions')
		.select('id')
		.eq('stripe_subscription_id', subId)
		.maybeSingle();
	if (!subRow) {
		console.warn('invoice for unknown subscription', subId);
		return;
	}

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
