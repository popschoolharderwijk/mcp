import { jsonResponse, UUID_RE } from '../_shared/http.ts';
import {
	formatAgreementLessonForm,
	isMandateArranged,
	isPaymentLinkAgreement,
	loadPaymentLinkAgreement,
	loadPaymentPreview,
	verifyPaymentLinkToken,
} from '../_shared/paymentLink.ts';
import { createAdminClient } from '../_shared/supabase.ts';

interface Body {
	lesson_agreement_id?: string;
	t?: string;
}

export async function handlePaymentLinkInfo(_req: Request, body: Body): Promise<Response> {
	const agreementId = body.lesson_agreement_id;
	if (!agreementId || !UUID_RE.test(agreementId)) return jsonResponse(200, { valid: false });

	const admin = createAdminClient();
	if (!(await verifyPaymentLinkToken(admin, agreementId, body.t))) return jsonResponse(200, { valid: false });

	const agreement = await loadPaymentLinkAgreement(admin, agreementId);
	if (!isPaymentLinkAgreement(agreement)) return jsonResponse(200, { valid: false });

	if (await isMandateArranged(admin, agreementId)) {
		return jsonResponse(200, { valid: true, arranged: true });
	}

	const preview = await loadPaymentPreview(admin, agreement);
	return jsonResponse(200, {
		valid: true,
		arranged: false,
		lesson_form: formatAgreementLessonForm(agreement),
		start_date: agreement.start_date,
		minimum_term_end: agreement.minimum_term_end,
		preview,
	});
}
