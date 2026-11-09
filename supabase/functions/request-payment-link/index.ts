// Public: request a new payment-link mail (rate-limited). Always returns the same message.

import { jsonResponse, UUID_RE } from '../_shared/http.ts';
import { getSiteBaseUrl } from '../_shared/http-serve.ts';
import {
	buildPaymentLinkRequestResponse,
	countRecentPaymentLinkRequests,
	isPaymentLinkRequestAllowedAddress,
	isPaymentLinkRequestRateLimited,
	issueAgreementPaymentLink,
	isValidEmailInput,
	loadBillingRecipientForStudent,
	paymentLinkBetaalblok,
	paymentLinkRequestWindowStart,
} from '../_shared/paymentLink.ts';
import { beginPublicJsonPost } from '../_shared/paymentLinkHttpHelpers.ts';
import { createPaymentLinkAdminClient } from '../_shared/paymentLinkServiceClient.ts';
import { sendTemplateEmail } from '../_shared/sendTemplateEmail.ts';

type Body = { lesson_agreement_id?: string; email?: string };

async function sendRequestedLink(
	admin: ReturnType<typeof createPaymentLinkAdminClient>,
	req: Request,
	agreementId: string,
	recipient: string,
): Promise<void> {
	const { paymentUrl } = await issueAgreementPaymentLink(admin, getSiteBaseUrl(req), agreementId);
	await sendTemplateEmail({
		event_key: 'agreement_created',
		to: recipient,
		vars: {
			leerling_naam: '',
			docent_naam: '',
			les_type: '',
			frequentie: '',
			prijs_per_les: '',
			dag: '',
			tijd: '',
			startdatum: '',
			betaalmethode: 'Stripe',
			betaalblok: paymentLinkBetaalblok(paymentUrl),
		},
		origin: req.headers.get('Origin'),
	});
	await admin.from('stripe_checkout_invitations').insert({
		lesson_agreement_id: agreementId,
		recipient_email: recipient,
		sent_by: null,
	});
}

async function canSendRequestedLink(
	admin: ReturnType<typeof createPaymentLinkAdminClient>,
	agreementId: string,
	email: string,
	studentUserId: string,
): Promise<boolean> {
	const billing = await loadBillingRecipientForStudent(admin, studentUserId);
	if (
		!isPaymentLinkRequestAllowedAddress(email.trim(), {
			parentEmail: billing.parentEmail,
			accountEmail: billing.accountEmail,
		})
	) {
		return false;
	}
	const recent = await countRecentPaymentLinkRequests(admin, agreementId, paymentLinkRequestWindowStart());
	return !isPaymentLinkRequestRateLimited(recent) && Boolean(billing.recipient);
}

function isAgreementOpenForPaymentLink(
	agreement: { is_active: boolean; stripe_schedule_id: string | null; student_user_id: string } | null,
): agreement is { is_active: boolean; stripe_schedule_id: string | null; student_user_id: string } {
	if (!agreement) return false;
	if (!agreement.is_active) return false;
	if (agreement.stripe_schedule_id) return false;
	return true;
}

async function sendIfBillingRecipient(
	admin: ReturnType<typeof createPaymentLinkAdminClient>,
	req: Request,
	agreementId: string,
	studentUserId: string,
): Promise<void> {
	const billing = await loadBillingRecipientForStudent(admin, studentUserId);
	if (!billing.recipient) return;
	await sendRequestedLink(admin, req, agreementId, billing.recipient);
}

async function maybeSendRequestedPaymentLink(req: Request, agreementId: string, email: string): Promise<void> {
	const admin = createPaymentLinkAdminClient();
	const { data: agreement } = await admin
		.from('lesson_agreements')
		.select('id, student_user_id, is_active, stripe_schedule_id')
		.eq('id', agreementId)
		.maybeSingle();
	if (!isAgreementOpenForPaymentLink(agreement)) return;
	if (!(await canSendRequestedLink(admin, agreementId, email, agreement.student_user_id))) return;
	await admin.from('payment_link_requests').insert({ lesson_agreement_id: agreementId });
	await sendIfBillingRecipient(admin, req, agreementId, agreement.student_user_id);
}

function hasValidRequestBody(body: Body): body is { lesson_agreement_id: string; email: string } {
	return Boolean(body.lesson_agreement_id && UUID_RE.test(body.lesson_agreement_id) && isValidEmailInput(body.email));
}

Deno.serve(async (req) => {
	const begun = await beginPublicJsonPost<Body>(req);
	if (!begun.ok) return begun.response;
	const generic = buildPaymentLinkRequestResponse();
	if (hasValidRequestBody(begun.body)) {
		await maybeSendRequestedPaymentLink(req, begun.body.lesson_agreement_id, begun.body.email);
	}
	return jsonResponse(200, generic);
});
