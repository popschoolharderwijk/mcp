// Public (token): start or complete Stripe Checkout setup for a payment link.
import { jsonResponse } from '../_shared/http.ts';
import { getSiteBaseUrl } from '../_shared/http-serve.ts';
import { buildPaymentLinkUrl, verifyAgreementPaymentLink } from '../_shared/paymentLink.ts';
import { beginPublicPaymentLinkTokenRequest } from '../_shared/paymentLinkHttpHelpers.ts';
import { createPaymentLinkAdminClient } from '../_shared/paymentLinkServiceClient.ts';
import { getSafeErrorMessage, getStripe } from '../_shared/stripe.ts';
import {
	ensureStripeCustomer,
	handleCheckoutMode,
	handleCompleteMode,
} from '../create-subscription-checkout/checkoutFlows.ts';
import type { AgreementRow, ProfileRow } from '../create-subscription-checkout/types.ts';

type Body = { mode?: 'checkout' | 'complete'; checkout_session_id?: string };

type LoadedCheckout =
	| { ok: false; response: Response }
	| {
			ok: true;
			admin: ReturnType<typeof createPaymentLinkAdminClient>;
			agreement: AgreementRow;
			profile: ProfileRow;
	  };

async function verifyCheckoutToken(
	admin: ReturnType<typeof createPaymentLinkAdminClient>,
	agreementId: string,
	token: string,
): Promise<LoadedCheckout | null> {
	if (await verifyAgreementPaymentLink(admin, agreementId, token)) return null;
	return { ok: false, response: jsonResponse(403, { error: 'Ongeldige betaallink' }) };
}

async function loadActiveAgreementRow(
	admin: ReturnType<typeof createPaymentLinkAdminClient>,
	agreementId: string,
): Promise<{ ok: false; response: Response } | { ok: true; agreement: AgreementRow }> {
	const { data: agreement } = await admin
		.from('lesson_agreements')
		.select('id, student_user_id, is_active')
		.eq('id', agreementId)
		.maybeSingle();
	if (!agreement) {
		return { ok: false, response: jsonResponse(409, { error: 'Overeenkomst is niet actief' }) };
	}
	if (!agreement.is_active) {
		return { ok: false, response: jsonResponse(409, { error: 'Overeenkomst is niet actief' }) };
	}
	return { ok: true, agreement: agreement as AgreementRow };
}

async function loadCheckoutProfile(
	admin: ReturnType<typeof createPaymentLinkAdminClient>,
	studentUserId: string,
): Promise<{ ok: false; response: Response } | { ok: true; profile: ProfileRow }> {
	const { data: profile } = await admin
		.from('profiles')
		.select('email, first_name, last_name')
		.eq('user_id', studentUserId)
		.maybeSingle();
	if (!profile) {
		return { ok: false, response: jsonResponse(422, { error: 'Geen e-mailadres bekend voor leerling' }) };
	}
	if (!profile.email) {
		return { ok: false, response: jsonResponse(422, { error: 'Geen e-mailadres bekend voor leerling' }) };
	}
	return { ok: true, profile: profile as ProfileRow };
}

async function loadAgreementForCheckout(agreementId: string, token: string): Promise<LoadedCheckout> {
	const admin = createPaymentLinkAdminClient();
	const tokenFail = await verifyCheckoutToken(admin, agreementId, token);
	if (tokenFail) return tokenFail;
	const agreementResult = await loadActiveAgreementRow(admin, agreementId);
	if (!agreementResult.ok) return agreementResult;
	const profileResult = await loadCheckoutProfile(admin, agreementResult.agreement.student_user_id);
	if (!profileResult.ok) return profileResult;
	return { ok: true, admin, agreement: agreementResult.agreement, profile: profileResult.profile };
}

async function startCheckoutSession(
	req: Request,
	loaded: Extract<LoadedCheckout, { ok: true }>,
	agreementId: string,
	token: string,
): Promise<Response> {
	const stripe = getStripe();
	const customerId = await ensureStripeCustomer(
		loaded.admin,
		stripe,
		loaded.agreement.student_user_id,
		loaded.profile,
	);
	const payUrl = buildPaymentLinkUrl(getSiteBaseUrl(req), agreementId, token);
	return handleCheckoutMode(stripe, req, loaded.agreement, customerId, {
		success_url: `${payUrl}&session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: payUrl,
	});
}

async function runTokenCheckout(req: Request, agreementId: string, token: string, body: Body): Promise<Response> {
	const loaded = await loadAgreementForCheckout(agreementId, token);
	if (!loaded.ok) return loaded.response;
	if (body.mode === 'complete') {
		return handleCompleteMode(loaded.admin, getStripe(), loaded.agreement, body.checkout_session_id);
	}
	return startCheckoutSession(req, loaded, agreementId, token);
}

Deno.serve(async (req) => {
	const begun = await beginPublicPaymentLinkTokenRequest(req);
	if (!begun.ok) return begun.response;
	try {
		return await runTokenCheckout(req, begun.agreementId, begun.token, begun.body);
	} catch (err) {
		console.error('start-payment-checkout', err);
		return jsonResponse(500, { error: getSafeErrorMessage(err, 'Kon betaalflow niet starten') });
	}
});
