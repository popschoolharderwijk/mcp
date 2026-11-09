// Sends confirmation emails to student/parent and teacher after creating a lesson
// agreement. Called from the agreement wizard once the insert into
// `lesson_agreements` succeeds. Errors are intentionally not rethrown: the
// agreement is already saved; the UI may show a warning at most.

import { supabase } from '@/integrations/supabase/client';
import {
	type AgreementMailSharedVars,
	buildAgreementMailContext,
	buildAgreementMailInvokeBody,
	buildAgreementMailTargets,
	resolveAgreementPayerEmail,
} from '@/lib/email/sendAgreementCreatedMailsHelpers';

export interface SendAgreementCreatedMailsResult {
	studentSent: boolean;
	teacherSent: boolean;
}

async function issuePaymentLinkBetaalblok(agreementId: string): Promise<string> {
	const { data, error } = await supabase.functions.invoke<{ betaalblok?: string }>('issue-payment-link', {
		body: { lesson_agreement_id: agreementId, send: false },
	});
	if (error || !data?.betaalblok) {
		console.error('issue-payment-link for agreement mail', error);
		return '';
	}
	return data.betaalblok;
}

async function sendAgreementMail(
	eventKey: 'agreement_created' | 'agreement_created_teacher',
	email: string,
	vars: AgreementMailSharedVars,
): Promise<boolean> {
	const { error: mailErr } = await supabase.functions.invoke('send-template-email', {
		body: buildAgreementMailInvokeBody(eventKey, email, vars),
	});
	if (mailErr) {
		console.error(`${eventKey} mail`, mailErr);
		return false;
	}
	return true;
}

export async function sendAgreementCreatedMails(agreementId: string): Promise<SendAgreementCreatedMailsResult> {
	const result: SendAgreementCreatedMailsResult = { studentSent: false, teacherSent: false };

	const { data: agreement, error } = await supabase
		.from('lesson_agreements')
		.select(
			`id, day_of_week, start_time, start_date, frequency, price_per_lesson,
			 student_user_id, teacher_user_id,
			 lesson_types(name)`,
		)
		.eq('id', agreementId)
		.maybeSingle();

	if (error || !agreement) {
		console.error('sendAgreementCreatedMails: overeenkomst niet gevonden', error);
		return result;
	}

	const [studentProfile, teacherProfile, studentRow, betaalblok] = await Promise.all([
		supabase
			.from('profiles')
			.select('email, first_name, last_name')
			.eq('user_id', agreement.student_user_id)
			.maybeSingle(),
		supabase
			.from('profiles')
			.select('email, first_name, last_name')
			.eq('user_id', agreement.teacher_user_id)
			.maybeSingle(),
		supabase.from('students').select('parent_email').eq('user_id', agreement.student_user_id).maybeSingle(),
		issuePaymentLinkBetaalblok(agreementId),
	]);

	const { sharedVars } = buildAgreementMailContext(agreement, studentProfile.data, teacherProfile.data);
	const studentVars: AgreementMailSharedVars = { ...sharedVars, betaalblok };
	const payerEmail = resolveAgreementPayerEmail(studentRow.data?.parent_email, studentProfile.data?.email);
	const targets = buildAgreementMailTargets(payerEmail, teacherProfile.data?.email);

	for (const target of targets) {
		const vars = target.eventKey === 'agreement_created' ? studentVars : sharedVars;
		const sent = await sendAgreementMail(target.eventKey, target.email, vars);
		if (target.eventKey === 'agreement_created') {
			result.studentSent = sent;
		}
		if (target.eventKey === 'agreement_created_teacher') {
			result.teacherSent = sent;
		}
	}

	return result;
}
