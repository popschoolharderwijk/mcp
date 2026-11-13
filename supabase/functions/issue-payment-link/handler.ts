import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
	beginAuthenticatedPostWithUuidField,
	jsonResponse,
	missingSiteBaseUrlResponse,
	resolveSiteBaseUrl,
} from '../_shared/http.ts';
import {
	buildPaymentLinkEmailHtml,
	issueAgreementPaymentLink,
	loadAgreementCreatedPaymentMailVars,
	loadBillingRecipientForStudent,
} from '../_shared/paymentLink.ts';
import {
	resolveIssuedLinkRecipientGate,
	resolveIssuePaymentRecipient,
	wantsTeacherNotifyOnIssuePaymentLink,
} from '../_shared/paymentLinkHelpers.ts';
import { sendTemplateEmail } from '../_shared/sendTemplateEmail.ts';
import { fetchUserRole, requireAuthenticatedClients } from '../_shared/supabase.ts';
import {
	canOverrideStripeCheckoutInviteRecipient,
	isStripeCheckoutInviteAdminRole,
	resolveStripeCheckoutAgreementAccessError,
} from '../send-stripe-checkout-invite/sendStripeCheckoutInviteHelpers.ts';

type Body = { lesson_agreement_id?: string; recipient_email?: string; notify_teacher?: boolean };
type Authorized = Extract<Awaited<ReturnType<typeof authorizeIssue>>, { ok: true }>;

async function authorizeIssue(authHeader: string, agreementId: string) {
	const auth = await requireAuthenticatedClients(authHeader);
	if (!auth.ok) return auth;
	const role = await fetchUserRole(auth.userClient, auth.user.id);
	const isAdmin = isStripeCheckoutInviteAdminRole(role);
	const { data: agreement, error: agErr } = await auth.admin
		.from('lesson_agreements')
		.select('id, student_user_id, teacher_user_id, is_active')
		.eq('id', agreementId)
		.maybeSingle();
	const access = resolveStripeCheckoutAgreementAccessError(agreement, agErr, isAdmin, auth.user.id);
	if (!access.ok) return { ok: false as const, response: jsonResponse(access.status, { error: access.error }) };
	const canOverrideRecipient = canOverrideStripeCheckoutInviteRecipient(
		isAdmin,
		access.agreement.teacher_user_id,
		auth.user.id,
	);
	return { ok: true as const, auth, agreement: access.agreement, canOverrideRecipient };
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

async function maybeNotifyAgreementTeacher(
	req: Request,
	admin: SupabaseClient,
	agreement: { id: string; teacher_user_id: string },
	notifyTeacher: boolean | undefined,
	paymentCtaMarkdown: string,
): Promise<boolean> {
	if (!wantsTeacherNotifyOnIssuePaymentLink(notifyTeacher)) return false;

	const { data: teacherProfile } = await admin
		.from('profiles')
		.select('email')
		.eq('user_id', agreement.teacher_user_id)
		.maybeSingle();
	const teacherEmail = teacherProfile?.email?.trim();
	if (!teacherEmail) return false;

	const vars = await loadAgreementCreatedPaymentMailVars(admin, agreement.id, paymentCtaMarkdown);
	const mail = await sendTemplateEmail({
		event_key: 'agreement_created_teacher',
		to: teacherEmail,
		vars,
		origin: req.headers.get('Origin'),
	});
	if (!mail.ok) {
		console.error('agreement_created_teacher mail', mail.error);
		return false;
	}
	return true;
}

async function recordIssuedInvite(authorized: Authorized, recipient: string): Promise<void> {
	await authorized.auth.admin.from('stripe_checkout_invitations').insert({
		lesson_agreement_id: authorized.agreement.id,
		recipient_email: recipient,
		sent_by: authorized.auth.user.id,
	});
}

function buildIssuedPayload(
	paymentUrl: string,
	paymentCtaMarkdown: string,
	recipient: string,
	teacherNotified: boolean,
) {
	return {
		payment_url: paymentUrl,
		payment_cta: paymentCtaMarkdown,
		recipient,
		sent: true,
		teacher_notified: teacherNotified,
	};
}

async function deliverIssuedLink(
	req: Request,
	authorized: Authorized,
	body: Pick<Body, 'recipient_email' | 'notify_teacher'>,
) {
	const billing = await loadBillingRecipientForStudent(authorized.auth.admin, authorized.agreement.student_user_id);
	const gated = resolveIssuedLinkRecipientGate(
		resolveIssuePaymentRecipient(body.recipient_email, billing.recipient, authorized.canOverrideRecipient),
	);
	if (!gated.ok) {
		return { ok: false as const, response: jsonResponse(gated.status, { error: gated.error }) };
	}

	const siteUrl = resolveSiteBaseUrl(req);
	if (!siteUrl) return { ok: false as const, response: missingSiteBaseUrlResponse() };
	const { paymentUrl } = await issueAgreementPaymentLink(authorized.auth.admin, siteUrl, authorized.agreement.id);
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
	const teacherNotified = await maybeNotifyAgreementTeacher(
		req,
		authorized.auth.admin,
		authorized.agreement,
		body.notify_teacher,
		paymentCtaMarkdown,
	);
	return {
		ok: true as const,
		payload: buildIssuedPayload(paymentUrl, paymentCtaMarkdown, gated.recipient, teacherNotified),
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
	const delivered = await deliverIssuedLink(req, authorized, begun.body);
	if (!delivered.ok) return delivered.response;
	return jsonResponse(200, delivered.payload);
}
