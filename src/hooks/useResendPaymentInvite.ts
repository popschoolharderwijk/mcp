import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
	buildIssuePaymentLinkBody,
	resolveIssuedPaymentUrl,
	resolveIssuePaymentLinkSendError,
	resolveSubscriptionActionError,
	resolveSubscriptionActionSuccess,
	SUBSCRIPTION_ACTION_FUNCTIONS,
} from '@/lib/subscriptions/subscriptionCardHelpers';

export type PaymentInviteBusyKind = 'resend' | 'open';

/** Issue payment link: resend mail (optional override address), or open the public pay page. */
export function useResendPaymentInvite(onDone?: () => void) {
	const [busyId, setBusyId] = useState<string | null>(null);
	const [busyKind, setBusyKind] = useState<PaymentInviteBusyKind | null>(null);

	const issuePaymentLink = async (
		agreementId: string,
		send: boolean,
		kind: PaymentInviteBusyKind,
		recipientEmail?: string,
	) => {
		setBusyId(agreementId);
		setBusyKind(kind);
		const { data, error } = await supabase.functions.invoke(SUBSCRIPTION_ACTION_FUNCTIONS['send-invite'], {
			body: buildIssuePaymentLinkBody(agreementId, send, recipientEmail),
		});
		setBusyId(null);
		setBusyKind(null);
		return { data, error };
	};

	const resend = async (agreementId: string, recipientEmail?: string) => {
		const { data, error } = await issuePaymentLink(agreementId, true, 'resend', recipientEmail);
		const message = await resolveIssuePaymentLinkSendError(data, error);
		if (message) {
			toast.error(message);
			return;
		}
		toast.success(resolveSubscriptionActionSuccess('send-invite', data));
		onDone?.();
	};

	const openPayPage = async (agreementId: string) => {
		const { data, error } = await issuePaymentLink(agreementId, false, 'open');
		const message = resolveSubscriptionActionError('send-invite', data, error);
		if (message) {
			toast.error(message);
			return;
		}
		const paymentUrl = resolveIssuedPaymentUrl(data);
		if (!paymentUrl) {
			toast.error('Geen betaallink ontvangen');
			return;
		}
		window.open(paymentUrl, '_blank', 'noopener,noreferrer');
	};

	return { busyId, busyKind, resend, openPayPage };
}
