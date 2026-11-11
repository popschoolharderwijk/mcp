// Sends confirmation emails to student/parent and teacher after creating a lesson
// agreement. Called from the agreement wizard once the insert into
// `lesson_agreements` succeeds. Errors are intentionally not rethrown: the
// agreement is already saved; the UI may show a warning at most.
//
// Student payment invite mail goes only through `issue-payment-link`
// so `stripe_checkout_invitations` always matches Machtigingen.

import { supabase } from '@/integrations/supabase/client';
import {
	type AgreementMailSharedVars,
	buildAgreementMailContext,
	buildAgreementMailInvokeBody,
} from '@/lib/email/sendAgreementCreatedMailsHelpers';
import { buildIssuePaymentLinkBody } from '@/lib/subscriptions/subscriptionCardHelpers';

export interface SendAgreementCreatedMailsResult {
	studentSent: boolean;
	teacherSent: boolean;
}

/** Single gate: issue token, send `agreement_created`, record `stripe_checkout_invitations`. */
async function sendStudentPaymentInvite(agreementId: string): Promise<boolean> {
	const { data, error } = await supabase.functions.invoke<{ sent?: boolean }>('issue-payment-link', {
		body: buildIssuePaymentLinkBody(agreementId),
	});
	if (error) {
		console.error('issue-payment-link for agreement mail', error);
		return false;
	}
	return data?.sent === true;
}

async function sendTeacherAgreementMail(email: string, vars: AgreementMailSharedVars): Promise<boolean> {
	const { error: mailErr } = await supabase.functions.invoke('send-template-email', {
		body: buildAgreementMailInvokeBody('agreement_created_teacher', email, vars),
	});
	if (mailErr) {
		console.error('agreement_created_teacher mail', mailErr);
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

	const [studentSent, studentProfile, teacherProfile] = await Promise.all([
		sendStudentPaymentInvite(agreementId),
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
	]);
	result.studentSent = studentSent;

	const teacherEmail = teacherProfile.data?.email;
	if (!teacherEmail) return result;

	const { sharedVars } = buildAgreementMailContext(agreement, studentProfile.data, teacherProfile.data);
	result.teacherSent = await sendTeacherAgreementMail(teacherEmail, sharedVars);
	return result;
}
