import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSiteBaseUrl } from '../_shared/http-serve.ts';
import { jsonResponse, UUID_RE } from '../_shared/http.ts';
import {
	isMandateArranged,
	isPaymentLinkAgreement,
	loadBillingContacts,
	loadPaymentLinkAgreement,
	PAYMENT_LINK_AGREEMENT_SELECT,
	type PaymentLinkAgreement,
	sendPaymentLinkInvite,
} from '../_shared/paymentLink.ts';
import {
	buildPaymentLinkRequestResponse,
	isPaymentLinkRequestAllowedAddress,
	isPaymentLinkRequestRateLimited,
	isValidEmailInput,
} from '../_shared/paymentLinkPure.ts';
import { createAdminClient } from '../_shared/supabase.ts';

interface Body {
	email?: unknown;
	lesson_agreement_id?: string;
}

/** Escape LIKE wildcards: we want an exact, case-insensitive match. */
const exactILike = (email: string) => email.replace(/[\\%_]/g, (c) => `\\${c}`);

async function findCandidateAgreements(admin: SupabaseClient, email: string): Promise<PaymentLinkAgreement[]> {
	const pattern = exactILike(email);
	const [{ data: profiles }, { data: students }] = await Promise.all([
		admin.from('profiles').select('user_id').ilike('email', pattern).limit(20),
		admin.from('students').select('user_id').ilike('parent_email', pattern).limit(20),
	]);
	const ids = [
		...new Set([...(profiles ?? []), ...(students ?? [])].map((r) => (r as { user_id: string }).user_id)),
	];
	if (ids.length === 0) return [];
	const { data } = await admin
		.from('lesson_agreements')
		.select(PAYMENT_LINK_AGREEMENT_SELECT)
		.in('student_user_id', ids)
		.eq('is_active', true)
		.eq('payment_method', 'stripe')
		.limit(20);
	return (data ?? []) as PaymentLinkAgreement[];
}

async function countRecentRequests(admin: SupabaseClient, agreementId: string): Promise<number> {
	const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
	const { count } = await admin
		.from('payment_link_requests')
		.select('id', { count: 'exact', head: true })
		.eq('lesson_agreement_id', agreementId)
		.gte('created_at', since);
	return count ?? 0;
}

async function processAgreement(
	admin: SupabaseClient,
	req: Request,
	agreement: PaymentLinkAgreement,
	email: string,
): Promise<void> {
	if (!isPaymentLinkAgreement(agreement)) return;
	const contacts = await loadBillingContacts(admin, agreement.student_user_id);
	if (!isPaymentLinkRequestAllowedAddress(email, contacts)) return;
	if (await isMandateArranged(admin, agreement.id)) return;
	if (isPaymentLinkRequestRateLimited(await countRecentRequests(admin, agreement.id))) return;

	await admin.from('payment_link_requests').insert({ lesson_agreement_id: agreement.id });
	const result = await sendPaymentLinkInvite({
		admin,
		agreement,
		recipient: email.trim(),
		siteUrl: getSiteBaseUrl(req),
		origin: req.headers.get('origin'),
		sentBy: null,
	});
	if (!result.ok) console.error('request-payment-link send failed', agreement.id, result.error);
}

export async function handleRequestPaymentLink(req: Request, body: Body): Promise<Response> {
	const response = jsonResponse(200, buildPaymentLinkRequestResponse());
	if (!isValidEmailInput(body.email)) return jsonResponse(400, { error: 'Vul een geldig e-mailadres in.' });
	const email = body.email.trim();
	const admin = createAdminClient();

	try {
		let agreements: PaymentLinkAgreement[];
		if (body.lesson_agreement_id && UUID_RE.test(body.lesson_agreement_id)) {
			const one = await loadPaymentLinkAgreement(admin, body.lesson_agreement_id);
			agreements = one ? [one] : [];
		} else {
			agreements = await findCandidateAgreements(admin, email);
		}
		for (const agreement of agreements) await processAgreement(admin, req, agreement, email);
	} catch (err) {
		// Same answer regardless of outcome; details only in the logs.
		console.error('request-payment-link error', err);
	}
	return response;
}
