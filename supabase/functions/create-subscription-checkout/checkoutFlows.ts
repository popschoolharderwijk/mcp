import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type Stripe from 'npm:stripe@17.5.0';
import {
	buildSetupScheduleIdempotencyKey,
	createScheduleForAgreement,
	ensureCatchUpInvoiceForAgreement,
} from '../_shared/billing.ts';
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
	resolveSetupIntentPaymentMethodId,
	validateCompleteCheckoutSessionId,
	validateCompleteCheckoutSessionMatch,
	validateCompleteModePaymentReady,
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

type CompleteModeReadyIds = {
	customerId: string;
	paymentMethodId: string;
	setupIntentId: string;
};

function resolveCompleteModeReadyIds(
	session: {
		mode: string;
		metadata?: { lesson_agreement_id?: string } | null;
		customer: unknown;
		setup_intent: Parameters<typeof getReusablePaymentMethodIdFromSetupIntent>[0] | string | null | undefined;
	},
	agreementId: string,
): { ready: CompleteModeReadyIds } | { error: Response } {
	const sessionMatchError = validateCompleteCheckoutSessionMatch(session, agreementId);
	if (sessionMatchError) return { error: sessionMatchError };

	const customerId = getStripeId(session.customer);
	const paymentMethodId = resolveSetupIntentPaymentMethodId(
		session.setup_intent,
		getReusablePaymentMethodIdFromSetupIntent,
	);
	const paymentReadyError = validateCompleteModePaymentReady(customerId, paymentMethodId);
	if (paymentReadyError) return { error: paymentReadyError };

	const setupIntentId = getStripeId(session.setup_intent);
	if (!setupIntentId) {
		return { error: jsonResponse(409, { error: 'SetupIntent ontbreekt op checkout sessie' }) };
	}

	return {
		ready: {
			customerId: customerId as string,
			paymentMethodId: paymentMethodId as string,
			setupIntentId,
		},
	};
}

async function attachCompleteModePaymentMethod(
	stripe: Stripe,
	customerId: string,
	paymentMethodId: string,
): Promise<Response | null> {
	try {
		await attachDefaultPaymentMethod(stripe, customerId, paymentMethodId);
		return null;
	} catch (e) {
		console.error('attach payment method failed', e);
		return jsonResponse(409, {
			error: getSafeErrorMessage(e, 'Kon betaalmethode niet koppelen aan klant'),
		});
	}
}

async function settleCatchUpForCompleteMode(
	admin: SupabaseClient,
	stripe: Stripe,
	agreementId: string,
	ready: CompleteModeReadyIds,
): Promise<Response | null> {
	try {
		await ensureCatchUpInvoiceForAgreement(admin, stripe, {
			lessonAgreementId: agreementId,
			customerId: ready.customerId,
			defaultPaymentMethod: ready.paymentMethodId,
			attemptId: ready.setupIntentId,
		});
		return null;
	} catch (e) {
		console.error('catch-up invoice failed during checkout complete', agreementId, e);
		return jsonResponse(500, {
			error: getSafeErrorMessage(
				e,
				'Machtiging staat, maar de inhaalfactuur mislukte. Neem contact op met de school.',
			),
		});
	}
}

async function respondCompleteModeWithCatchUp(
	admin: SupabaseClient,
	stripe: Stripe,
	agreementId: string,
	ready: CompleteModeReadyIds,
	scheduleId: string,
): Promise<Response> {
	const catchUpError = await settleCatchUpForCompleteMode(admin, stripe, agreementId, ready);
	if (catchUpError) return catchUpError;
	return buildCompleteModeSuccessResponse({ scheduleId });
}

async function createCompleteModeScheduleOrRecover(
	admin: SupabaseClient,
	stripe: Stripe,
	agreement: AgreementRow,
	ready: CompleteModeReadyIds,
): Promise<Response> {
	try {
		const built = await createScheduleForAgreement(admin, stripe, {
			lessonAgreementId: agreement.id,
			customerId: ready.customerId,
			defaultPaymentMethod: ready.paymentMethodId,
			attemptId: ready.setupIntentId,
			idempotencyKey: buildSetupScheduleIdempotencyKey(agreement.id, ready.setupIntentId),
		});
		return buildCompleteModeSuccessResponse(built);
	} catch (e) {
		const scheduleId = await loadExistingScheduleId(admin, agreement.id);
		if (scheduleId) {
			return respondCompleteModeWithCatchUp(admin, stripe, agreement.id, ready, scheduleId);
		}
		console.error('create schedule during checkout complete failed', agreement.id, e);
		return jsonResponse(500, {
			error: getSafeErrorMessage(e, 'Kon machtiging niet afronden. Probeer het opnieuw of neem contact op.'),
		});
	}
}

async function finalizeCompleteModeSchedule(
	admin: SupabaseClient,
	stripe: Stripe,
	agreement: AgreementRow,
	checkoutSessionId: string,
	existingScheduleId: string | null,
): Promise<Response> {
	const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
		expand: ['setup_intent.latest_attempt'],
	});
	const resolved = resolveCompleteModeReadyIds(session, agreement.id);
	if ('error' in resolved) return resolved.error;

	const attachError = await attachCompleteModePaymentMethod(
		stripe,
		resolved.ready.customerId,
		resolved.ready.paymentMethodId,
	);
	if (attachError) return attachError;

	if (existingScheduleId) {
		return respondCompleteModeWithCatchUp(admin, stripe, agreement.id, resolved.ready, existingScheduleId);
	}

	return createCompleteModeScheduleOrRecover(admin, stripe, agreement, resolved.ready);
}

export async function handleCompleteMode(
	admin: SupabaseClient,
	stripe: Stripe,
	agreement: AgreementRow,
	checkoutSessionId: string | undefined,
): Promise<Response> {
	const sessionIdError = validateCompleteCheckoutSessionId(checkoutSessionId);
	if (sessionIdError) return sessionIdError;

	const existingScheduleId = await loadExistingScheduleId(admin, agreement.id);
	return finalizeCompleteModeSchedule(admin, stripe, agreement, checkoutSessionId as string, existingScheduleId);
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
