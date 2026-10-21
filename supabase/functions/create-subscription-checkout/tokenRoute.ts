// Token route: the fixed payment link lets the customer go to iDEAL without logging in.
// The token (hash check) authorises exactly one agreement; no other data is exposed.
import { handleCorsPreflight, jsonResponse, requirePost, resolveSiteBaseUrl, UUID_RE } from '../_shared/http.ts';
import {
	isMandateArranged,
	isPaymentLinkAgreement,
	loadPaymentLinkAgreement,
	verifyPaymentLinkToken,
} from '../_shared/paymentLink.ts';
import { buildPaymentLinkUrl } from '../_shared/paymentLinkPure.ts';
import { getStripe } from '../_shared/stripe.ts';
import { CUSTOMER_DIRECT_DEBIT_ERROR } from '../_shared/stripeRecoveryPure.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { ensureStripeCustomer, handleCheckoutMode, handleCompleteMode } from './checkoutFlows.ts';
import type { Body, ProfileRow } from './types.ts';

const INVALID_LINK = 'Deze link is niet meer geldig. Vraag hieronder een nieuwe link aan.';

/** Returns the token when the request uses the token route, otherwise null. */
export async function readPaymentToken(req: Request): Promise<string | null> {
	if (req.method !== 'POST') return null;
	try {
		const body = (await req.clone().json()) as Body;
		return typeof body.payment_token === 'string' && body.payment_token ? body.payment_token : null;
	} catch {
		return null;
	}
}

export async function handleTokenCheckout(req: Request): Promise<Response> {
	const preflight = handleCorsPreflight(req);
	if (preflight) return preflight;
	const notPost = requirePost(req);
	if (notPost) return notPost;
	const body = (await req.json()) as Body;
	const agreementId = body.lesson_agreement_id;
	if (!agreementId || !UUID_RE.test(agreementId)) return jsonResponse(400, { error: INVALID_LINK });

	const admin = createAdminClient();
	if (!(await verifyPaymentLinkToken(admin, agreementId, body.payment_token))) {
		return jsonResponse(403, { error: INVALID_LINK, invalid_link: true });
	}
	const agreement = await loadPaymentLinkAgreement(admin, agreementId);
	if (!isPaymentLinkAgreement(agreement)) return jsonResponse(403, { error: INVALID_LINK, invalid_link: true });

	try {
		const stripe = getStripe();
		if (body.mode === 'complete') {
			return await handleCompleteMode(admin, stripe, agreement, body.checkout_session_id);
		}
		if (await isMandateArranged(admin, agreementId)) {
			return jsonResponse(200, { mode: 'complete', already_arranged: true });
		}
		const { data: profile } = await admin
			.from('profiles')
			.select('email, first_name, last_name')
			.eq('user_id', agreement.student_user_id)
			.maybeSingle();
		if (!profile) return jsonResponse(404, { error: CUSTOMER_DIRECT_DEBIT_ERROR });
		const customerId = await ensureStripeCustomer(admin, stripe, agreement.student_user_id, profile as ProfileRow);
		const pageUrl = buildPaymentLinkUrl(
			resolveSiteBaseUrl(req, Deno.env.get('SITE_URL')),
			agreementId,
			body.payment_token as string,
		);
		return await handleCheckoutMode(
			stripe,
			req,
			agreement,
			customerId,
			{},
			{
				successUrl: `${pageUrl}&session_id={CHECKOUT_SESSION_ID}`,
				cancelUrl: pageUrl,
			},
		);
	} catch (err) {
		console.error('token checkout error', err);
		return jsonResponse(500, { error: CUSTOMER_DIRECT_DEBIT_ERROR });
	}
}
