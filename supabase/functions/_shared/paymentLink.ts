/** DB IO for fixed payment links. Pure token math lives in paymentLinkHelpers.ts. */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
	buildAgreementCreatedPaymentMailVars,
	buildBillingRecipientBundle,
	buildPaymentLinkUrl,
	computeMinimumTermEnd,
	extractAgreementPaymentMailLessonTypeName,
	generatePaymentLinkToken,
	hashPaymentLinkToken,
	paymentLinkTokenMatches,
} from './paymentLinkHelpers.ts';

export {
	buildPaymentLinkEmailHtml,
	buildPaymentLinkRequestResponse,
	buildPaymentLinkUrl,
	isPaymentLinkRequestAllowedAddress,
	isPaymentLinkRequestRateLimited,
	isValidEmailInput,
} from './paymentLinkHelpers.ts';

/** Creates a new token (rotates any previous). Plaintext is only available at issue time. */
export async function issueAgreementPaymentLink(
	admin: SupabaseClient,
	siteUrl: string,
	lessonAgreementId: string,
): Promise<{ token: string; paymentUrl: string }> {
	const token = generatePaymentLinkToken();
	const tokenHash = await hashPaymentLinkToken(token);
	await admin.from('agreement_payment_links').upsert({
		lesson_agreement_id: lessonAgreementId,
		token_hash: tokenHash,
		rotated_at: new Date().toISOString(),
	});
	await ensureMinimumTermEnd(admin, lessonAgreementId);
	return { token, paymentUrl: buildPaymentLinkUrl(siteUrl, lessonAgreementId, token) };
}

async function ensureMinimumTermEnd(admin: SupabaseClient, lessonAgreementId: string): Promise<void> {
	const { data: agreement } = await admin
		.from('lesson_agreements')
		.select('start_date, minimum_term_end')
		.eq('id', lessonAgreementId)
		.maybeSingle();
	if (!agreement || agreement.minimum_term_end) return;
	await admin
		.from('lesson_agreements')
		.update({ minimum_term_end: computeMinimumTermEnd(agreement.start_date) })
		.eq('id', lessonAgreementId);
}

export async function verifyAgreementPaymentLink(
	admin: SupabaseClient,
	lessonAgreementId: string,
	token: string,
): Promise<boolean> {
	const { data } = await admin
		.from('agreement_payment_links')
		.select('token_hash')
		.eq('lesson_agreement_id', lessonAgreementId)
		.maybeSingle();
	return paymentLinkTokenMatches(token, data?.token_hash);
}

export async function loadBillingRecipientForStudent(
	admin: SupabaseClient,
	studentUserId: string,
): Promise<{ recipient: string | null; parentEmail: string | null; accountEmail: string | null }> {
	const [{ data: profile }, { data: student }] = await Promise.all([
		admin.from('profiles').select('email').eq('user_id', studentUserId).maybeSingle(),
		admin.from('students').select('parent_email').eq('user_id', studentUserId).maybeSingle(),
	]);
	return buildBillingRecipientBundle(student?.parent_email, profile?.email);
}

/** Loads agreement + names for `agreement_created` payment-link mails. */
export async function loadAgreementCreatedPaymentMailVars(
	admin: SupabaseClient,
	lessonAgreementId: string,
	paymentCtaMarkdown: string,
): Promise<Record<string, string>> {
	const { data: agreement } = await admin
		.from('lesson_agreements')
		.select(
			`day_of_week, start_time, start_date, frequency, price_per_lesson,
			 student_user_id, teacher_user_id,
			 lesson_types ( name )`,
		)
		.eq('id', lessonAgreementId)
		.maybeSingle();

	if (!agreement) {
		return buildAgreementCreatedPaymentMailVars({
			agreement: {
				day_of_week: 0,
				start_time: '',
				start_date: '',
				frequency: '',
				price_per_lesson: null,
			},
			student: null,
			teacher: null,
			lessonTypeName: '',
			paymentCtaMarkdown,
		});
	}

	const [{ data: student }, { data: teacher }] = await Promise.all([
		admin.from('profiles').select('first_name, last_name').eq('user_id', agreement.student_user_id).maybeSingle(),
		admin.from('profiles').select('first_name, last_name').eq('user_id', agreement.teacher_user_id).maybeSingle(),
	]);

	return buildAgreementCreatedPaymentMailVars({
		agreement: {
			day_of_week: agreement.day_of_week,
			start_time: agreement.start_time,
			start_date: agreement.start_date,
			frequency: agreement.frequency,
			price_per_lesson: agreement.price_per_lesson,
		},
		student,
		teacher,
		lessonTypeName: extractAgreementPaymentMailLessonTypeName(agreement.lesson_types),
		paymentCtaMarkdown,
	});
}

export async function countRecentPaymentLinkRequests(
	admin: SupabaseClient,
	lessonAgreementId: string,
	sinceIso: string,
): Promise<number> {
	const { count } = await admin
		.from('payment_link_requests')
		.select('id', { count: 'exact', head: true })
		.eq('lesson_agreement_id', lessonAgreementId)
		.gte('created_at', sinceIso);
	return count ?? 0;
}

export function paymentLinkRequestWindowStart(now = new Date()): string {
	return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
}
