import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type Stripe from 'npm:stripe@17.5.0';
import { buildSetupScheduleIdempotencyKey, createScheduleForAgreement } from '../_shared/billing.ts';
import { jsonResponse, missingSiteBaseUrlResponse, resolveSiteBaseUrl } from '../_shared/http.ts';
import {
	buildCheckoutSessionUrls,
	buildCompleteModeArrangementResponse,
	buildDirectModeSuccessResponse,
	buildStripeCustomerDisplayName,
	resolveCompleteModeArrangement,
	resolveDirectModePaymentMethodId,
	validateCompleteCheckoutSessionId,
	validateCompleteCheckoutSessionMatch,
} from './checkoutFlowsHelpers.ts';
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

async function loadExistingScheduleId(admin: SupabaseClient, agreementId: string): Promise<string | null> {
	const { data: existingAgreement } = await admin
		.from('lesson_agreements')
		.select('stripe_schedule_id')
		.eq('id', agreementId)
		.maybeSingle();
	return existingAgreement?.stripe_schedule_id ?? null;
}

/**
 * Status-only after Checkout return. Schedule + catch-up are created by the Stripe webhook
 * (source of truth). Clients poll until `schedule_id` is present.
 */
export async function handleCompleteMode(
	admin: SupabaseClient,
	stripe: Stripe,
	agreement: AgreementRow,
	checkoutSessionId: string | undefined,
): Promise<Response> {
	const sessionIdError = validateCompleteCheckoutSessionId(checkoutSessionId);
	if (sessionIdError) return sessionIdError;

	const session = await stripe.checkout.sessions.retrieve(checkoutSessionId as string);
	const sessionMatchError = validateCompleteCheckoutSessionMatch(session, agreement.id);
	if (sessionMatchError) return sessionMatchError;

	const scheduleId = await loadExistingScheduleId(admin, agreement.id);
	return buildCompleteModeArrangementResponse(resolveCompleteModeArrangement(session.status, scheduleId), scheduleId);
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
			error: 'Geen standaard betaalmethode op deze klant. Start eerst een checkout om een betaalmethode te koppelen.',
		});
	}

	const attemptId = `direct_${crypto.randomUUID()}`;
	const built = await createScheduleForAgreement(admin, stripe, {
		lessonAgreementId: agreement.id,
		customerId,
		defaultPaymentMethod: defaultPmId,
		attemptId,
		idempotencyKey: buildSetupScheduleIdempotencyKey(agreement.id, attemptId),
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
	const origin = resolveSiteBaseUrl(req);
	if (!origin) return missingSiteBaseUrlResponse();
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
