import { jsonResponse } from '../_shared/http.ts';
import { getSiteBaseUrl, type LessonAgreementPostContext } from '../_shared/http-serve.ts';
import {
	loadBillingContacts,
	loadPaymentLinkAgreement,
	type PaymentLinkAgreement,
	sendPaymentLinkInvite,
} from '../_shared/paymentLink.ts';
import {
	readBillingKind,
	resolveNotStripeAgreementFailure,
	resolveOneOffAgreementFailure,
} from '../_shared/paymentMethodPure.ts';
import { fetchUserRole, requireAuthenticatedClients } from '../_shared/supabase.ts';
import {
	buildDirectDebitInviteSuccessPayload,
	isDirectDebitInvitePrivilegedRole,
	resolveDirectDebitAgreementAccessError,
	resolveDirectDebitInviteMissingEmailResponse,
} from './sendDirectDebitInvitePure.ts';

/**
 * Sends `direct_debit_invite` with the fixed payment link (new token per send) to the
 * billing recipient: parent e-mail when known, otherwise the account e-mail.
 */
export async function handleSendDirectDebitInvite(ctx: LessonAgreementPostContext): Promise<Response> {
	const auth = await requireAuthenticatedClients(ctx.authHeader);
	if (!auth.ok) return auth.response;

	const role = await fetchUserRole(auth.userClient, auth.user.id);
	const isPrivileged = isDirectDebitInvitePrivilegedRole(role);

	const agreement = await loadPaymentLinkAgreement(auth.admin, ctx.lessonAgreementId);
	const access = resolveDirectDebitAgreementAccessError(agreement, null, isPrivileged, auth.user.id);
	if (!access.ok) return jsonResponse(access.status, { error: access.error });
	const ag = agreement as PaymentLinkAgreement;

	const notStripe = resolveNotStripeAgreementFailure(ag.payment_method);
	if (notStripe) return jsonResponse(notStripe.status, { error: notStripe.error });
	const oneOff = resolveOneOffAgreementFailure(readBillingKind(ag.lesson_type_options));
	if (oneOff) return jsonResponse(oneOff.status, { error: oneOff.error });

	const { recipient } = await loadBillingContacts(auth.admin, ag.student_user_id);
	if (!recipient) {
		const missing = resolveDirectDebitInviteMissingEmailResponse();
		return jsonResponse(missing.status, { error: missing.error });
	}

	const result = await sendPaymentLinkInvite({
		admin: auth.admin,
		agreement: ag,
		recipient,
		siteUrl: getSiteBaseUrl(ctx.req),
		origin: ctx.req.headers.get('origin'),
		sentBy: auth.user.id,
	});
	if (!result.ok) return jsonResponse(result.status, { error: result.error });
	return jsonResponse(200, buildDirectDebitInviteSuccessPayload(recipient));
}
