import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getInvokeErrorMessage } from '@/lib/auth/invokeError';
import {
	buildIssuePaymentLinkBody,
	buildStaffCheckoutBody,
	decideStaffCheckoutOpen,
	resolveIssuePaymentLinkSendError,
	resolveSubscriptionActionSuccess,
	SUBSCRIPTION_ACTION_FUNCTIONS,
} from '@/lib/subscriptions/subscriptionCardHelpers';

export type PaymentInviteBusyKind = 'resend' | 'open';

const STAFF_CHECKOUT_FUNCTION = 'create-subscription-checkout';

/** Resend payment-link mail, or open Stripe Checkout for staff without rotating the mailed token. */
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

	const openPayPage = async (agreementId: string): Promise<string | null> => {
		setBusyId(agreementId);
		setBusyKind('open');
		const { data, error } = await supabase.functions.invoke(STAFF_CHECKOUT_FUNCTION, {
			body: buildStaffCheckoutBody(agreementId),
		});
		setBusyId(null);
		setBusyKind(null);
		const decision = decideStaffCheckoutOpen(data, Boolean(error));
		if (decision.kind === 'ok') return decision.url;
		if (decision.kind === 'invoke_error') {
			toast.error(await getInvokeErrorMessage(error, { fallback: 'Kon het betaalscherm niet openen' }));
			return null;
		}
		toast.error(decision.kind === 'data_error' ? decision.message : 'Geen betaalscherm-URL ontvangen');
		return null;
	};

	return { busyId, busyKind, resend, openPayPage };
}
