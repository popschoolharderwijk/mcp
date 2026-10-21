import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildAgreementPaymentVars, escapeConfirmationHtml } from './agreementConfirmationPure.ts';
import { formatInviteDate, formatInviteName } from './directDebitInvitePure.ts';
import {
	formatAgreementLessonForm,
	loadBillingContacts,
	loadPaymentLinkAgreement,
	loadPaymentPreview,
	rotatePaymentLinkToken,
} from './paymentLink.ts';
import { buildPaymentLinkUrl } from './paymentLinkPure.ts';
import { sendTemplateEmail } from './sendTemplateEmail.ts';

/** The only customer confirmation sender, shared by wizard, duo and signup approval. */
export async function sendAgreementConfirmation(
	agreementId: string,
	opts: {
		admin: SupabaseClient;
		siteUrl: string;
		origin: string | null;
		sentBy: string | null;
	},
): Promise<boolean> {
	try {
		const { admin } = opts;
		const agreement = await loadPaymentLinkAgreement(admin, agreementId);
		if (!agreement) return false;
		const [{ recipient }, { data: details }] = await Promise.all([
			loadBillingContacts(admin, agreement.student_user_id),
			admin
				.from('lesson_agreements')
				.select('teacher_user_id, day_of_week, start_time, frequency')
				.eq('id', agreementId)
				.single(),
		]);
		if (!recipient || !details) return false;
		const [{ data: student }, { data: teacher }] = await Promise.all([
			admin
				.from('profiles')
				.select('first_name, last_name')
				.eq('user_id', agreement.student_user_id)
				.maybeSingle(),
			admin.from('profiles').select('first_name, last_name').eq('user_id', details.teacher_user_id).maybeSingle(),
		]);
		const preview = await loadPaymentPreview(admin, agreement);
		if (agreement.payment_method === 'stripe' && !preview.monthly) return false;
		const token = agreement.payment_method === 'stripe' ? await rotatePaymentLinkToken(admin, agreementId) : null;
		const vars = {
			leerling_naam: escapeConfirmationHtml(formatInviteName(student?.first_name, student?.last_name)),
			docent_naam: escapeConfirmationHtml(formatInviteName(teacher?.first_name, teacher?.last_name)),
			les_type: escapeConfirmationHtml(formatAgreementLessonForm(agreement)),
			frequentie:
				(
					{
						weekly: 'wekelijks',
						biweekly: 'om de week',
						monthly: 'maandelijks',
						daily: 'dagelijks',
					} as Record<string, string>
				)[details.frequency] ?? '',
			dag:
				['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'][details.day_of_week] ??
				'',
			tijd: details.start_time.slice(0, 5),
			startdatum: formatInviteDate(agreement.start_date),
			...buildAgreementPaymentVars({
				paymentMethod: agreement.payment_method,
				preview,
				minimumTermEnd: agreement.minimum_term_end,
				link: token ? buildPaymentLinkUrl(opts.siteUrl, agreementId, token) : '',
			}),
		};
		const sent = await sendTemplateEmail({
			event_key: 'agreement_created',
			to: recipient,
			vars,
			origin: opts.origin,
		});
		if (!sent) return false;
		if (token) {
			const { error } = await admin
				.from('direct_debit_invitations')
				.insert({ lesson_agreement_id: agreementId, recipient_email: recipient, sent_by: opts.sentBy });
			if (error) {
				console.error('Confirmation invitation audit failed', error);
				return false;
			}
		}
		return true;
	} catch (error) {
		console.error('Agreement confirmation failed', error);
		return false;
	}
}
