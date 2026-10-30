import { beginAuthenticatedPostWithUuidField, jsonResponse } from '../_shared/http.ts';
import { getSiteBaseUrl } from '../_shared/http-serve.ts';
import {
	issueAgreementPaymentLink,
	loadBillingRecipientForStudent,
	paymentLinkBetaalblok,
} from '../_shared/paymentLink.ts';
import { sendTemplateEmail } from '../_shared/sendTemplateEmail.ts';
import { fetchUserRole, requireAuthenticatedClients } from '../_shared/supabase.ts';
import {
	isStripeCheckoutInvitePrivilegedRole,
	resolveStripeCheckoutAgreementAccessError,
} from '../send-stripe-checkout-invite/sendStripeCheckoutInviteHelpers.ts';

type Body = { lesson_agreement_id?: string; send?: boolean };
type Authorized = Extract<Awaited<ReturnType<typeof authorizeIssue>>, { ok: true }>;

async function authorizeIssue(authHeader: string, agreementId: string) {
	const auth = await requireAuthenticatedClients(authHeader);
	if (!auth.ok) return auth;
	const role = await fetchUserRole(auth.userClient, auth.user.id);
	const { data: agreement, error: agErr } = await auth.admin
		.from('lesson_agreements')
		.select('id, student_user_id, is_active')
		.eq('id', agreementId)
		.maybeSingle();
	const access = resolveStripeCheckoutAgreementAccessError(
		agreement,
		agErr,
		isStripeCheckoutInvitePrivilegedRole(role),
		auth.user.id,
	);
	if (!access.ok) return { ok: false as const, response: jsonResponse(access.status, { error: access.error }) };
	return { ok: true as const, auth, agreement: access.agreement };
}

async function sendPaymentLinkMail(req: Request, recipient: string, betaalblok: string): Promise<void> {
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
			betaalblok,
		},
		origin: req.headers.get('Origin'),
	});
}

async function maybeMailPaymentLink(
	req: Request,
	send: boolean,
	recipient: string | null,
	betaalblok: string,
): Promise<Response | null> {
	if (!send) return null;
	if (recipient) {
		await sendPaymentLinkMail(req, recipient, betaalblok);
		return null;
	}
	return jsonResponse(400, { error: 'Geen e-mailadres voor betaler' });
}

async function recordIssuedInvite(authorized: Authorized, recipient: string | null, send: boolean): Promise<void> {
	if (!recipient) return;
	await authorized.auth.admin.from('stripe_checkout_invitations').insert({
		lesson_agreement_id: authorized.agreement.id,
		recipient_email: recipient,
		sent_by: send ? authorized.auth.user.id : null,
	});
}

function buildIssuedPayload(paymentUrl: string, betaalblok: string, recipient: string | null, send: boolean) {
	return {
		payment_url: paymentUrl,
		betaalblok,
		recipient,
		sent: Boolean(send && recipient),
	};
}

async function deliverIssuedLink(req: Request, authorized: Authorized, send: boolean) {
	const { paymentUrl } = await issueAgreementPaymentLink(
		authorized.auth.admin,
		getSiteBaseUrl(req),
		authorized.agreement.id,
	);
	const betaalblok = paymentLinkBetaalblok(paymentUrl);
	const billing = await loadBillingRecipientForStudent(authorized.auth.admin, authorized.agreement.student_user_id);
	const mailErr = await maybeMailPaymentLink(req, send, billing.recipient, betaalblok);
	if (mailErr) return { ok: false as const, response: mailErr };
	await recordIssuedInvite(authorized, billing.recipient, send);
	return {
		ok: true as const,
		payload: buildIssuedPayload(paymentUrl, betaalblok, billing.recipient, send),
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
	const delivered = await deliverIssuedLink(req, authorized, begun.body.send !== false);
	if (!delivered.ok) return delivered.response;
	return jsonResponse(200, delivered.payload);
}
