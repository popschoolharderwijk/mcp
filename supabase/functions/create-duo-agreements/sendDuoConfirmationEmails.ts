import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSiteBaseUrl } from '../_shared/http-serve.ts';
import { sendAgreementConfirmation } from '../_shared/sendAgreementConfirmation.ts';
import { sendTemplateEmail } from '../_shared/sendTemplateEmail.ts';
import { buildDuoConfirmationEmailPlan, buildDuoTemplateEmailVars } from './duoConfirmationEmailPure.ts';
import { formatMonthlyAmount } from './formatPure.ts';
import type { Body } from './types.ts';

/** Regular monthly amount per duo student (each has an own age category). */
async function loadAmountLabel(admin: SupabaseClient, agreementId: string): Promise<string> {
	const { data } = await admin.rpc('agreement_fee_months', {
		p_agreement_id: agreementId,
		p_from_month: new Date().toISOString().slice(0, 8) + '01',
		p_months: 14,
	});
	const regular = ((data ?? []) as Array<{ amount_cents: number; is_prorated: boolean }>).find(
		(m) => Number(m.amount_cents) > 0 && !m.is_prorated,
	);
	return formatMonthlyAmount(regular ? Number(regular.amount_cents) : null);
}

export async function sendDuoConfirmationEmails(
	admin: SupabaseClient,
	req: Request,
	body: Body,
	agreementIdByStudent: Map<string, string> = new Map(),
): Promise<boolean> {
	try {
		const { data: lt } = await admin
			.from('lesson_types')
			.select('name')
			.eq('id', body.lesson_type_id)
			.maybeSingle();
		const { data: profs } = await admin
			.from('profiles')
			.select('user_id, email, first_name, last_name')
			.in('user_id', [body.student_user_id_a, body.student_user_id_b, body.teacher_user_id]);
		const plan = buildDuoConfirmationEmailPlan(body, lt?.name ?? '', profs, req.headers.get('Origin'));
		for (const job of plan.jobs) {
			const agreementId = job.studentUserId ? agreementIdByStudent.get(job.studentUserId) : undefined;
			if (agreementId) job.amountLabel = await loadAmountLabel(admin, agreementId);
		}
		const results = await Promise.all(
			[...agreementIdByStudent.values()].map((agreementId) =>
				sendAgreementConfirmation(agreementId, {
					admin,
					siteUrl: getSiteBaseUrl(req),
					origin: plan.origin,
					sentBy: null,
				}),
			),
		);
		for (const job of plan.jobs) {
			if (job.teacherEmail)
				await sendTemplateEmail({
					event_key: 'agreement_created_teacher',
					to: job.teacherEmail,
					vars: buildDuoTemplateEmailVars(plan.baseVars, job.studentName, job.amountLabel),
					origin: plan.origin,
				});
		}
		return results.length === 2 && results.every(Boolean);
	} catch (mailErr) {
		console.error('duo agreement mail block', mailErr);
		return false;
	}
}
