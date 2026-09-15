import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type Stripe from 'npm:stripe@17.5.0';
import { createScheduleForAgreement } from '../_shared/billing.ts';
import { jsonResponse, resolveSiteBaseUrl } from '../_shared/http.ts';
import {
	attachDefaultPaymentMethod,
	getReusablePaymentMethodIdFromSetupIntent,
	getSafeErrorMessage,
	getStripeId,
} from '../_shared/stripe.ts';
import {
	buildCheckoutSessionUrls,
	buildCompleteModeSuccessResponse,
	buildDirectModeSuccessResponse,
	buildStripeCustomerDisplayName,
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
	const { data: existingCustomer } = await admin
		.from('stripe_customers')
		.select('stripe_customer_id')
		.eq('user_id', billingUserId)
		.maybeSingle();

	let customerId = existingCustomer?.stripe_customer_id ?? null;
	if (customerId) return customerId;

	const customer = await stripe.customers.create({
		email: profile.email,
		name: buildStripeCustomerDisplayName(profile.first_name, profile.last_name),
		metadata: { user_id: billingUserId },
	});
	customerId = customer.id;
	await admin.from('stripe_customers').insert({ user_id: billingUserId, stripe_customer_id: customerId });
	return customerId;
}

async function loadExistingCompleteScheduleResponse(
	admin: SupabaseClient,
	agreementId: string,
): Promise<Response | null> {
	const { data: existingAgreement } = await admin
		.from('lesson_agreements')
		.select('stripe_schedule_id')
		.eq('id', agreementId)
		.maybeSingle();
	return resolveExistingScheduleResponse(existingAgreement?.stripe_schedule_id);
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
		return jsonResponse(409, {
			error: getSafeErrorMessage(e, 'Kon betaalmethode niet koppelen aan klant'),
		});
	}

	const built = await createScheduleForAgreement(admin, stripe, {
		lessonAgreementId: agreement.id,
		customerId,
		defaultPaymentMethod: paymentMethodId,
	});
	return buildCompleteModeSuccessResponse(built);
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

	const built = await createScheduleForAgreement(admin, stripe, {
		lessonAgreementId: agreement.id,
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
): Promise<Response> {
	const origin = resolveSiteBaseUrl(req, Deno.env.get('SITE_URL'));
	const urls = buildCheckoutSessionUrls(origin, agreement.id, body);
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
