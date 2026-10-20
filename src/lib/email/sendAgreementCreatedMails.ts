// Sends confirmation emails to student and teacher after creating a lesson
// agreement. Called from the agreement wizard once the insert into
// `lesson_agreements` succeeds. Errors are intentionally not rethrown: the
// agreement is already saved; the UI may show a warning at most.

import { supabase } from '@/integrations/supabase/client';
import { formatFeePreviewLabel } from '@/lib/billing/lessonFeeFormat';
import { loadAgreementFeePreview } from '@/lib/billing/loadLessonFeePreview';
import {
	type AgreementMailSharedVars,
	buildAgreementMailContext,
	buildAgreementMailInvokeBody,
	buildAgreementMailTargets,
} from '@/lib/email/sendAgreementCreatedMailsHelpers';

export interface SendAgreementCreatedMailsResult {
	studentSent: boolean;
	teacherSent: boolean;
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
			`id, day_of_week, start_time, start_date, frequency, payment_method,
			 student_user_id, teacher_user_id,
			 lesson_types(name)`,
		)
		.eq('id', agreementId)
		.maybeSingle();

	if (error || !agreement) {
		console.error('sendAgreementCreatedMails: overeenkomst niet gevonden', error);
		return result;
	}

	const [studentProfile, teacherProfile, fee] = await Promise.all([
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
		loadAgreementFeePreview(agreement.id, agreement.student_user_id),
	]);

	const { sharedVars } = buildAgreementMailContext(
		agreement,
		studentProfile.data,
		teacherProfile.data,
		formatFeePreviewLabel(fee.preview),
	);
	const targets = buildAgreementMailTargets(studentProfile.data?.email, teacherProfile.data?.email);

	for (const target of targets) {
		const sent = await sendAgreementMail(target.eventKey, target.email, sharedVars);
		if (target.eventKey === 'agreement_created') {
			result.studentSent = sent;
		}
		if (target.eventKey === 'agreement_created_teacher') {
			result.teacherSent = sent;
		}
	}

	return result;
}
