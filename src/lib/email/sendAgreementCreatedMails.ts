// Sends confirmation emails to student/parent and teacher after creating a lesson
// agreement. Called from the agreement wizard once the insert into
// `lesson_agreements` succeeds. Errors are intentionally not rethrown: the
// agreement is already saved; the UI may show a warning at most.
//
// Both mails go through `issue-payment-link` (service-role send-template-email):
// student payment invite + optional teacher notify. Staff must not call
// send-template-email with an arbitrary `to` address.

import { supabase } from '@/integrations/supabase/client';
import { buildIssuePaymentLinkBody } from '@/lib/subscriptions/subscriptionCardHelpers';

export interface SendAgreementCreatedMailsResult {
	studentSent: boolean;
	teacherSent: boolean;
}

export async function sendAgreementCreatedMails(agreementId: string): Promise<SendAgreementCreatedMailsResult> {
	const { data, error } = await supabase.functions.invoke<{ sent?: boolean; teacher_notified?: boolean }>(
		'issue-payment-link',
		{
			body: buildIssuePaymentLinkBody(agreementId, undefined, { notifyTeacher: true }),
		},
	);
	if (error) {
		console.error('issue-payment-link for agreement mail', error);
		return { studentSent: false, teacherSent: false };
	}
	return {
		studentSent: data?.sent === true,
		teacherSent: data?.teacher_notified === true,
	};
}
