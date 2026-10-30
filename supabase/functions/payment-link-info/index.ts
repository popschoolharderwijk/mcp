// Public: validate payment-link token and return agreement + billing preview for /pay.
import { buildBillingComputationFromLoadedData } from '../_shared/billingHelpers.ts';
import { jsonResponse } from '../_shared/http.ts';
import { verifyAgreementPaymentLink } from '../_shared/paymentLink.ts';
import {
	buildArrangedPaymentLinkInfo,
	buildOpenPaymentLinkInfo,
	buildPaymentLinkPreview,
	type PaymentLinkInfoAgreement,
} from '../_shared/paymentLinkHelpers.ts';
import { beginPublicPaymentLinkTokenRequest } from '../_shared/paymentLinkHttpHelpers.ts';
import { createPaymentLinkAdminClient } from '../_shared/paymentLinkServiceClient.ts';

async function loadPreviewParts(
	admin: ReturnType<typeof createPaymentLinkAdminClient>,
	agreement: PaymentLinkInfoAgreement,
) {
	return Promise.all([
		admin.from('students').select('date_of_birth').eq('user_id', agreement.student_user_id).maybeSingle(),
		admin
			.from('lesson_type_options')
			.select('price_per_lesson_youth_cents, price_per_lesson_adult_cents')
			.eq('lesson_type_id', agreement.lesson_type_id)
			.eq('duration_minutes', agreement.duration_minutes)
			.eq('frequency', agreement.frequency)
			.maybeSingle(),
		admin.from('no_lesson_periods').select('start_date, end_date'),
	]);
}

function studentDob(student: { date_of_birth: string | null } | null | undefined): string | null {
	if (!student) return null;
	return student.date_of_birth;
}

function previewFromLoadedParts(
	agreement: PaymentLinkInfoAgreement,
	today: string,
	student: { date_of_birth: string | null } | null | undefined,
	option: {
		price_per_lesson_youth_cents: number | null;
		price_per_lesson_adult_cents: number | null;
	} | null,
	periods: Array<{ start_date: string; end_date: string }> | null,
) {
	if (!option) return null;
	const yearly = buildBillingComputationFromLoadedData({
		agreement,
		option,
		dateOfBirth: studentDob(student),
		noLessonPeriods: periods == null ? [] : periods,
		today,
	}).yearly;
	return buildPaymentLinkPreview(agreement.start_date, today, yearly);
}

async function computePreview(
	admin: ReturnType<typeof createPaymentLinkAdminClient>,
	agreement: PaymentLinkInfoAgreement,
	today: string,
) {
	const [{ data: student }, { data: option }, { data: periods }] = await loadPreviewParts(admin, agreement);
	return previewFromLoadedParts(agreement, today, student, option, periods);
}

async function loadActiveAgreement(
	admin: ReturnType<typeof createPaymentLinkAdminClient>,
	agreementId: string,
	token: string,
): Promise<PaymentLinkInfoAgreement | null> {
	if (!(await verifyAgreementPaymentLink(admin, agreementId, token))) return null;
	const { data } = await admin
		.from('lesson_agreements')
		.select(
			`id, start_date, end_date, frequency, duration_minutes, day_of_week, minimum_term_end,
			 student_user_id, lesson_type_id, is_active, stripe_schedule_id, lesson_types(name)`,
		)
		.eq('id', agreementId)
		.maybeSingle();
	if (!data?.is_active) return null;
	return data as PaymentLinkInfoAgreement;
}

async function respondPaymentLinkInfo(agreementId: string, token: string): Promise<Response> {
	const admin = createPaymentLinkAdminClient();
	const row = await loadActiveAgreement(admin, agreementId, token);
	if (!row) return jsonResponse(200, { valid: false });
	if (row.stripe_schedule_id) return jsonResponse(200, buildArrangedPaymentLinkInfo(row));
	const today = new Date().toISOString().slice(0, 10);
	try {
		return jsonResponse(200, buildOpenPaymentLinkInfo(row, await computePreview(admin, row, today)));
	} catch (e) {
		console.error('payment-link-info preview', e);
		return jsonResponse(200, buildOpenPaymentLinkInfo(row, null));
	}
}

Deno.serve(async (req) => {
	const begun = await beginPublicPaymentLinkTokenRequest(req);
	if (!begun.ok) return begun.response;
	return respondPaymentLinkInfo(begun.agreementId, begun.token);
});
