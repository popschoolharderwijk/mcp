import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
	buildIssuePaymentLinkBody,
	decideIssueAndOpenPay,
	resolveIssuePaymentLinkSendError,
	resolveSubscriptionActionSuccess,
	SUBSCRIPTION_ACTION_FUNCTIONS,
} from '@/lib/subscriptions/subscriptionCardHelpers';

export type PaymentInviteBusyKind = 'resend' | 'open';

/** Resend payment-link mail, or issue that mail and open the `/pay` overview link. */
export function useResendPaymentInvite(onDone?: () => void) {
	const [busyId, setBusyId] = useState<string | null>(null);
	const [busyKind, setBusyKind] = useState<PaymentInviteBusyKind | null>(null);

	const resend = async (agreementId: string, recipientEmail?: string) => {
		setBusyId(agreementId);
		setBusyKind('resend');
		const { data, error } = await supabase.functions.invoke(SUBSCRIPTION_ACTION_FUNCTIONS['send-invite'], {
			body: buildIssuePaymentLinkBody(agreementId, recipientEmail),
		});
		setBusyId(null);
		setBusyKind(null);
		const message = await resolveIssuePaymentLinkSendError(data, error);
		if (message) {
			toast.error(message);
			return;
		}
		toast.success(resolveSubscriptionActionSuccess('send-invite', data));
		onDone?.();
	};

	const openPayPage = async (agreementId: string, recipientEmail?: string): Promise<string | null> => {
		setBusyId(agreementId);
		setBusyKind('open');
		const { data, error } = await supabase.functions.invoke(SUBSCRIPTION_ACTION_FUNCTIONS['send-invite'], {
			body: buildIssuePaymentLinkBody(agreementId, recipientEmail),
		});
		setBusyId(null);
		setBusyKind(null);
		const decision = await decideIssueAndOpenPay(data, error);
		if (decision.kind === 'error') {
			toast.error(decision.message);
			return null;
		}
		toast.success(decision.successMessage);
		onDone?.();
		return decision.url;
	};

	return { busyId, busyKind, resend, openPayPage };
}
