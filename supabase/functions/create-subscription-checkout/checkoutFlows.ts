import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type Stripe from 'npm:stripe@17.5.0';
import { jsonResponse, resolveSiteBaseUrl } from '../_shared/http.ts';
import {
	attachDefaultPaymentMethod,
	getReusablePaymentMethodIdFromSetupIntent,
	getStripeId,
} from '../_shared/stripe.ts';
import { resolveStripeBillingIdentity, stripeBillingIdentityChanged } from '../_shared/stripeBillingIdentityPure.ts';
import { CUSTOMER_DIRECT_DEBIT_ERROR, retrieveIfExists } from '../_shared/stripeRecoveryPure.ts';
import { findOpenSubscription, recordRebuildError, syncAgreementSchedule } from '../_shared/subscriptionSchedule.ts';
import {
	buildCheckoutSessionUrls,
	buildCompleteModeSuccessResponse,
	buildDirectModeSuccessResponse,
	resolveDirectModePaymentMethodId,
	resolveExistingScheduleResponse,
	resolveSetupIntentPaymentMethodId,
	validateCompleteCheckoutSessionId,
	validateCompleteCheckoutSessionMatch,
	validateCompleteModePaymentReady,
} from './checkoutFlowsPure.ts';
import type { AgreementRow, ProfileRow } from './types.ts';

export async function ensureStripeCustomer(
	admin: SupabaseClient,
	stripe: Stripe,
	billingUserId: string,
	profile: ProfileRow,
): Promise<string> {
	const { data: student, error: studentError } = await admin
		.from('students')
		.select('parent_email, parent_name, debtor_name, debtor_info_same_as_student')
		.eq('user_id', billingUserId)
		.maybeSingle();
	if (studentError) throw new Error(studentError.message);
	const identity = resolveStripeBillingIdentity({
		accountEmail: profile.email,
		firstName: profile.first_name,
		lastName: profile.last_name,
		parentEmail: student?.parent_email,
		parentName: student?.parent_name,
		debtorName: student?.debtor_name,
		debtorSameAsStudent: student?.debtor_info_same_as_student,
	});
	const { data: existingCustomer } = await admin
		.from('stripe_customers')
		.select('stripe_customer_id')
		.eq('user_id', billingUserId)
		.maybeSingle();

	let customerId = existingCustomer?.stripe_customer_id ?? null;
	if (customerId) {
		// A stored customer from another Stripe account does not exist here: create a new one.
		const found = await retrieveIfExists(customerId, (id) => stripe.customers.retrieve(id));
		if (found && !found.deleted) {
			if (stripeBillingIdentityChanged(found, identity)) await stripe.customers.update(customerId, identity);
			return customerId;
		}
	}

	const customer = await stripe.customers.create({
		...identity,
		metadata: { user_id: billingUserId },
	});
	customerId = customer.id;
	const { error } = await admin
		.from('stripe_customers')
		.upsert({ user_id: billingUserId, stripe_customer_id: customerId }, { onConflict: 'user_id' });
	if (error) throw new Error(error.message);
	return customerId;
}

async function loadExistingCompleteScheduleResponse(
	admin: SupabaseClient,
	agreementId: string,
): Promise<Response | null> {
	const existing = await findOpenSubscription(admin, agreementId);
	return resolveExistingScheduleResponse(existing?.stripe_schedule_id);
}

async function finalizeCompleteModeSchedule(
	admin: SupabaseClient,
	stripe: Stripe,
	agreement: AgreementRow,
	checkoutSessionId: string,
): Promise<Response> {
	const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
		expand: ['setup_intent.latest_attempt'],
	});
	const sessionMatchError = validateCompleteCheckoutSessionMatch(session, agreement.id);
	if (sessionMatchError) return sessionMatchError;

	const customerId = getStripeId(session.customer);
	const paymentMethodId = resolveSetupIntentPaymentMethodId(
		session.setup_intent,
		getReusablePaymentMethodIdFromSetupIntent,
	);
	const paymentReadyError = validateCompleteModePaymentReady(customerId, paymentMethodId);
	if (paymentReadyError) return paymentReadyError;

	try {
		await attachDefaultPaymentMethod(stripe, customerId, paymentMethodId);
	} catch (e) {
		console.error('attach payment method failed', e);
		await recordRebuildError(admin, agreement.id, e, customerId);
		return jsonResponse(409, { error: CUSTOMER_DIRECT_DEBIT_ERROR });
	}

	try {
		const built = await syncAgreementSchedule(admin, stripe, {
			agreementId: agreement.id,
			customerId: customerId as string,
			defaultPaymentMethod: paymentMethodId as string,
		});
		return buildCompleteModeSuccessResponse(built);
	} catch (err) {
		// The mandate is attached to the customer; Synchroniseer or the daily task rebuilds later.
		console.error('complete mode schedule failed', err);
		await recordRebuildError(admin, agreement.id, err, customerId);
		return jsonResponse(502, { error: CUSTOMER_DIRECT_DEBIT_ERROR });
	}
}

export async function handleCompleteMode(
	admin: SupabaseClient,
	stripe: Stripe,
	agreement: AgreementRow,
	checkoutSessionId: string | undefined,
): Promise<Response> {
	const sessionIdError = validateCompleteCheckoutSessionId(checkoutSessionId);
	if (sessionIdError) return sessionIdError;

	const existingScheduleResponse = await loadExistingCompleteScheduleResponse(admin, agreement.id);
	if (existingScheduleResponse) return existingScheduleResponse;

	return finalizeCompleteModeSchedule(admin, stripe, agreement, checkoutSessionId as string);
}

export async function handleDirectMode(
	admin: SupabaseClient,
	stripe: Stripe,
	agreement: AgreementRow,
	customerId: string,
): Promise<Response> {
	const customer = await stripe.customers.retrieve(customerId);
	if (customer.deleted) return jsonResponse(400, { error: 'Stripe customer is verwijderd' });
	const defaultPmId = resolveDirectModePaymentMethodId(customer.invoice_settings?.default_payment_method);
	if (!defaultPmId) {
		return jsonResponse(409, {
			error: 'Geen standaard betaalmethode op deze klant. Start eerst een checkout om een SEPA-mandaat te koppelen.',
		});
	}

	const built = await syncAgreementSchedule(admin, stripe, {
		agreementId: agreement.id,
		customerId,
		defaultPaymentMethod: defaultPmId,
	});

	return buildDirectModeSuccessResponse(built);
}

export async function handleCheckoutMode(
	stripe: Stripe,
	req: Request,
	agreement: AgreementRow,
	customerId: string,
	body: { success_url?: string; cancel_url?: string },
	fixedUrls?: { successUrl: string; cancelUrl: string },
): Promise<Response> {
	const origin = resolveSiteBaseUrl(req, Deno.env.get('SITE_URL'));
	const urls = fixedUrls ? { ok: true as const, ...fixedUrls } : buildCheckoutSessionUrls(origin, agreement.id, body);
	if (!urls.ok) return jsonResponse(400, { error: urls.error });
	const { successUrl, cancelUrl } = urls;

	const session = await stripe.checkout.sessions.create({
		mode: 'setup',
		customer: customerId,
		payment_method_types: ['ideal', 'sepa_debit'],
		locale: 'nl',
		currency: 'eur',
		setup_intent_data: {
			metadata: {
				lesson_agreement_id: agreement.id,
				flow: 'schedule_setup',
			},
		},
		metadata: {
			lesson_agreement_id: agreement.id,
			flow: 'schedule_setup',
		},
		success_url: successUrl,
		cancel_url: cancelUrl,
	});

	return jsonResponse(200, { mode: 'checkout', url: session.url, session_id: session.id });
}
