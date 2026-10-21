import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
	buildSubscriptionActionBody,
	resolveSubscriptionActionError,
	resolveSubscriptionActionSuccess,
	SUBSCRIPTION_ACTION_FUNCTIONS,
} from '@/lib/subscriptions/subscriptionCardHelpers';

/** "Opnieuw versturen": new fixed payment link mail for one agreement. */
export function useResendPaymentInvite(onDone?: () => void) {
	const [busyId, setBusyId] = useState<string | null>(null);

	const resend = async (agreementId: string) => {
		setBusyId(agreementId);
		const { data, error } = await supabase.functions.invoke(SUBSCRIPTION_ACTION_FUNCTIONS['send-invite'], {
			body: buildSubscriptionActionBody('send-invite', agreementId, '', ''),
		});
		setBusyId(null);
		const message = resolveSubscriptionActionError('send-invite', data, error);
		if (message) {
			toast.error(message);
			return;
		}
		toast.success(resolveSubscriptionActionSuccess('send-invite', data));
		onDone?.();
	};

	return { busyId, resend };
}
