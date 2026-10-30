/** DB IO for fixed payment links. Pure token math lives in paymentLinkHelpers.ts. */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
	buildBillingRecipientBundle,
	buildPaymentLinkEmailHtml,
	buildPaymentLinkUrl,
	computeMinimumTermEnd,
	generatePaymentLinkToken,
	hashPaymentLinkToken,
	paymentLinkTokenMatches,
} from './paymentLinkHelpers.ts';

export {
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

export function paymentLinkBetaalblok(paymentUrl: string): string {
	return buildPaymentLinkEmailHtml(paymentUrl);
}
