// Wizard post-save mails: student payment invite and teacher notify both go through
// `issue-payment-link` (service-role delivery). Errors stay soft — agreement already saved.

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
