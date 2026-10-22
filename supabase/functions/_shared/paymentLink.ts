// IO around the fixed payment link: rotate/verify tokens, mandate status, amount preview
// and the `direct_debit_invite` e-mail with the fixed link. Pure rules: paymentLinkPure.ts.
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
	buildDirectDebitInviteVars,
	formatInviteLessonForm,
	formatInviteName,
	type InviteFee,
	resolveInviteFeeMonths,
	resolveInviteRecipientName,
} from './directDebitInvitePure.ts';
import { deliverPaymentLink } from './paymentLinkDeliveryPure.ts';
import {
	buildPaymentLinkUrl,
	buildPaymentPreview,
	generatePaymentLinkToken,
	hashPaymentLinkToken,
	type PaymentPreview,
	type PreviewFeeMonth,
	paymentLinkTokenMatches,
	resolveBillingRecipient,
	resolvePreviewMonthRange,
} from './paymentLinkPure.ts';
import { sendTemplateEmail } from './sendTemplateEmail.ts';
import { findOpenSubscription, todayIso } from './subscriptionSchedule.ts';

export const PAYMENT_LINK_AGREEMENT_SELECT =
	'id, student_user_id, is_active, payment_method, lesson_type_option_id, start_date, end_date, cancellation_effective_date, minimum_term_end, lesson_types(name), lesson_type_options(billing_kind, duration_minutes, frequency, label)';

export interface PaymentLinkAgreement {
	id: string;
	student_user_id: string;
	is_active: boolean;
	payment_method: string;
	lesson_type_option_id: string | null;
	start_date: string;
	end_date: string | null;
	cancellation_effective_date: string | null;
	minimum_term_end: string | null;
	lesson_types: { name: string } | null;
	lesson_type_options: {
		billing_kind: string;
		duration_minutes: number;
		frequency: string;
		label: string | null;
	} | null;
}

export async function loadPaymentLinkAgreement(
	admin: SupabaseClient,
	agreementId: string,
): Promise<PaymentLinkAgreement | null> {
	const { data } = await admin
		.from('lesson_agreements')
		.select(PAYMENT_LINK_AGREEMENT_SELECT)
		.eq('id', agreementId)
		.maybeSingle();
	return (data as PaymentLinkAgreement | null) ?? null;
}

/** Stripe, active, monthly: the only agreements a payment link applies to. */
export function isPaymentLinkAgreement(a: PaymentLinkAgreement | null): a is PaymentLinkAgreement {
	return Boolean(a?.is_active && a.payment_method === 'stripe' && a.lesson_type_options?.billing_kind !== 'one_off');
}

/** Commit a delivered token; never invalidate the old link before successful mail delivery. */
export async function storePaymentLinkToken(admin: SupabaseClient, agreementId: string, token: string): Promise<void> {
	const tokenHash = await hashPaymentLinkToken(token);
	const { error } = await admin
		.from('agreement_payment_links')
		.upsert(
			{ lesson_agreement_id: agreementId, token_hash: tokenHash, rotated_at: new Date().toISOString() },
			{ onConflict: 'lesson_agreement_id' },
		);
	if (error) throw new Error(error.message);
}

export async function verifyPaymentLinkToken(
	admin: SupabaseClient,
	agreementId: string,
	token: string | null | undefined,
): Promise<boolean> {
	const { data } = await admin
		.from('agreement_payment_links')
		.select('token_hash')
		.eq('lesson_agreement_id', agreementId)
		.maybeSingle();
	return paymentLinkTokenMatches(token, (data as { token_hash: string } | null)?.token_hash);
}

/** Mandate is arranged once an open subscription has a schedule or subscription in Stripe. */
export async function isMandateArranged(admin: SupabaseClient, agreementId: string): Promise<boolean> {
	const open = await findOpenSubscription(admin, agreementId);
	return Boolean(open?.stripe_schedule_id || open?.stripe_subscription_id);
}

export async function loadPaymentPreview(
	admin: SupabaseClient,
	agreement: PaymentLinkAgreement,
	today = todayIso(),
): Promise<PaymentPreview> {
	const range = resolvePreviewMonthRange(agreement.start_date, today);
	const { data, error } = await admin.rpc('agreement_fee_months', {
		p_agreement_id: agreement.id,
		p_from_month: range.fromMonth,
		p_months: range.months,
	});
	if (error) throw new Error(error.message);
	const months = ((data ?? []) as PreviewFeeMonth[]).map((m) => ({
		month: m.month,
		amount_cents: Number(m.amount_cents),
		btw_rate: Number(m.btw_rate ?? 0),
		is_prorated: Boolean(m.is_prorated),
	}));
	return buildPaymentPreview({
		startDate: agreement.start_date,
		today,
		months,
		billingKind: agreement.lesson_type_options?.billing_kind,
	});
}

export function formatAgreementLessonForm(agreement: PaymentLinkAgreement): string {
	return formatInviteLessonForm(agreement.lesson_types?.name ?? 'Les', agreement.lesson_type_options);
}

export interface BillingContacts {
	accountEmail: string | null;
	parentEmail: string | null;
	recipient: string | null;
}

export async function loadBillingContacts(admin: SupabaseClient, studentUserId: string): Promise<BillingContacts> {
	const [{ data: profile }, { data: student }] = await Promise.all([
		admin.from('profiles').select('email').eq('user_id', studentUserId).maybeSingle(),
		admin.from('students').select('parent_email').eq('user_id', studentUserId).maybeSingle(),
	]);
	const accountEmail = (profile as { email: string | null } | null)?.email ?? null;
	const parentEmail = (student as { parent_email: string | null } | null)?.parent_email ?? null;
	return { accountEmail, parentEmail, recipient: resolveBillingRecipient({ parentEmail, accountEmail }) };
}

async function fetchFee(
	admin: SupabaseClient,
	agreement: PaymentLinkAgreement,
	dateOfBirth: string | null,
	month: string,
): Promise<InviteFee> {
	const ends = [agreement.end_date, agreement.cancellation_effective_date].filter((d): d is string => Boolean(d));
	const { data, error } = await admin.rpc('preview_lesson_fee', {
		p_lesson_type_option_id: agreement.lesson_type_option_id,
		p_date_of_birth: dateOfBirth,
		p_start_date: agreement.start_date,
		p_end_date: ends.length ? ends.sort()[0] : null,
		p_month: month,
	});
	if (error) throw new Error(error.message);
	const row = (data ?? [])[0] as InviteFee | undefined;
	if (!row) throw new Error('Geen bedrag berekend');
	return row;
}

export type SendPaymentLinkResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * Sends `direct_debit_invite` with a NEW fixed link (the previous token stops working)
 * and records the send in direct_debit_invitations.
 */
export async function sendPaymentLinkInvite(opts: {
	admin: SupabaseClient;
	agreement: PaymentLinkAgreement;
	recipient: string;
	siteUrl: string;
	origin: string | null;
	sentBy: string | null;
}): Promise<SendPaymentLinkResult> {
	const { admin, agreement } = opts;
	if (!agreement.lesson_type_option_id) {
		return { ok: false, status: 422, error: 'Deze overeenkomst heeft nog geen lesvorm met tarief.' };
	}

	const [{ data: profile }, { data: student }] = await Promise.all([
		admin.from('profiles').select('first_name, last_name').eq('user_id', agreement.student_user_id).maybeSingle(),
		admin
			.from('students')
			.select('date_of_birth, parent_name, debtor_name, debtor_info_same_as_student')
			.eq('user_id', agreement.student_user_id)
			.maybeSingle(),
	]);

	let firstFee: InviteFee;
	let regularFee: InviteFee;
	try {
		const [m1, m2] = resolveInviteFeeMonths(agreement.start_date);
		[firstFee, regularFee] = await Promise.all([
			fetchFee(admin, agreement, student?.date_of_birth ?? null, m1),
			fetchFee(admin, agreement, student?.date_of_birth ?? null, m2),
		]);
	} catch (err) {
		console.error('preview_lesson_fee error', err);
		return { ok: false, status: 422, error: 'Kon het lesgeld niet berekenen' };
	}

	const token = generatePaymentLinkToken();
	const studentName = formatInviteName(profile?.first_name, profile?.last_name);
	const vars = buildDirectDebitInviteVars({
		studentName,
		recipientName: resolveInviteRecipientName({
			studentName,
			parentName: student?.parent_name,
			debtorName: student?.debtor_name,
			debtorSameAsStudent: student?.debtor_info_same_as_student,
		}),
		lessonForm: formatAgreementLessonForm(agreement),
		firstFee,
		regularFee,
		startDate: agreement.start_date,
		minimumTermEnd: agreement.minimum_term_end,
		link: buildPaymentLinkUrl(opts.siteUrl, agreement.id, token),
	});

	const sent = await deliverPaymentLink(
		() =>
			sendTemplateEmail({
				event_key: 'direct_debit_invite',
				to: opts.recipient,
				vars,
				origin: opts.origin,
			}),
		() => storePaymentLinkToken(admin, agreement.id, token),
	);
	if (!sent) return { ok: false, status: 502, error: 'Versturen van de uitnodiging is mislukt' };

	const { error } = await admin.from('direct_debit_invitations').insert({
		lesson_agreement_id: agreement.id,
		recipient_email: opts.recipient,
		sent_by: opts.sentBy,
	});
	if (error) throw new Error(error.message);
	return { ok: true };
}
