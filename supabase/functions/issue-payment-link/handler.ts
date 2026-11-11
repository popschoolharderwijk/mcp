import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { beginAuthenticatedPostWithUuidField, jsonResponse } from '../_shared/http.ts';
import { getSiteBaseUrl } from '../_shared/http-serve.ts';
import {
	buildPaymentLinkEmailHtml,
	issueAgreementPaymentLink,
	loadAgreementCreatedPaymentMailVars,
	loadBillingRecipientForStudent,
} from '../_shared/paymentLink.ts';
import { resolveIssuedLinkRecipientGate, resolveIssuePaymentRecipient } from '../_shared/paymentLinkHelpers.ts';
import { sendTemplateEmail } from '../_shared/sendTemplateEmail.ts';
import { fetchUserRole, requireAuthenticatedClients } from '../_shared/supabase.ts';
import {
	isStripeCheckoutInvitePrivilegedRole,
	resolveStripeCheckoutAgreementAccessError,
} from '../send-stripe-checkout-invite/sendStripeCheckoutInviteHelpers.ts';

type Body = { lesson_agreement_id?: string; recipient_email?: string };
type Authorized = Extract<Awaited<ReturnType<typeof authorizeIssue>>, { ok: true }>;

async function authorizeIssue(authHeader: string, agreementId: string) {
	const auth = await requireAuthenticatedClients(authHeader);
	if (!auth.ok) return auth;
	const role = await fetchUserRole(auth.userClient, auth.user.id);
	const isPrivileged = isStripeCheckoutInvitePrivilegedRole(role);
	const { data: agreement, error: agErr } = await auth.admin
		.from('lesson_agreements')
		.select('id, student_user_id, is_active')
		.eq('id', agreementId)
		.maybeSingle();
	const access = resolveStripeCheckoutAgreementAccessError(agreement, agErr, isPrivileged, auth.user.id);
	if (!access.ok) return { ok: false as const, response: jsonResponse(access.status, { error: access.error }) };
	return { ok: true as const, auth, agreement: access.agreement, isPrivileged };
}

async function sendPaymentLinkMail(
	req: Request,
	admin: SupabaseClient,
	agreementId: string,
	recipient: string,
	paymentCtaMarkdown: string,
): Promise<Response | null> {
	const vars = await loadAgreementCreatedPaymentMailVars(admin, agreementId, paymentCtaMarkdown);
	const mail = await sendTemplateEmail({
		event_key: 'agreement_created',
		to: recipient,
		vars,
		origin: req.headers.get('Origin'),
	});
	if (mail.ok) return null;
	return jsonResponse(mail.status ?? 502, { error: mail.error });
}

async function recordIssuedInvite(authorized: Authorized, recipient: string): Promise<void> {
	await authorized.auth.admin.from('stripe_checkout_invitations').insert({
		lesson_agreement_id: authorized.agreement.id,
		recipient_email: recipient,
		sent_by: authorized.auth.user.id,
	});
}

function buildIssuedPayload(paymentUrl: string, paymentCtaMarkdown: string, recipient: string) {
	return {
		payment_url: paymentUrl,
		payment_cta: paymentCtaMarkdown,
		recipient,
		sent: true,
	};
}

async function deliverIssuedLink(req: Request, authorized: Authorized, recipientOverride: string | undefined) {
	const billing = await loadBillingRecipientForStudent(authorized.auth.admin, authorized.agreement.student_user_id);
	const gated = resolveIssuedLinkRecipientGate(
		resolveIssuePaymentRecipient(recipientOverride, billing.recipient, authorized.isPrivileged),
	);
	if (!gated.ok) {
		return { ok: false as const, response: jsonResponse(gated.status, { error: gated.error }) };
	}

	const { paymentUrl } = await issueAgreementPaymentLink(
		authorized.auth.admin,
		getSiteBaseUrl(req),
		authorized.agreement.id,
	);
	const paymentCtaMarkdown = buildPaymentLinkEmailHtml(paymentUrl);
	const mailErr = await sendPaymentLinkMail(
		req,
		authorized.auth.admin,
		authorized.agreement.id,
		gated.recipient,
		paymentCtaMarkdown,
	);
	if (mailErr) return { ok: false as const, response: mailErr };
	await recordIssuedInvite(authorized, gated.recipient);
	return {
		ok: true as const,
		payload: buildIssuedPayload(paymentUrl, paymentCtaMarkdown, gated.recipient),
	};
}

export async function handleIssuePaymentLinkRequest(req: Request): Promise<Response> {
	const begun = await beginAuthenticatedPostWithUuidField<Body>(
		req,
		(body) => body.lesson_agreement_id,
		'lesson_agreement_id',
	);
	if (!begun.ok) return begun.response;
	const authorized = await authorizeIssue(begun.authHeader, begun.uuid);
	if (!authorized.ok) return authorized.response;
	const delivered = await deliverIssuedLink(req, authorized, begun.body.recipient_email);
	if (!delivered.ok) return delivered.response;
	return jsonResponse(200, delivered.payload);
}
