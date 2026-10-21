import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchIsAwaitingMandate } from '@/lib/subscriptions/awaitingMandateLoad';
import type { SubscriptionRow } from '@/types/subscriptions';

/** Latest Stripe subscription + last invitation date for one lesson agreement (RLS-scoped). */
export function useSubscription(lessonAgreementId: string) {
	const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
	const [lastInviteAt, setLastInviteAt] = useState<string | null>(null);
	const [awaitingMandate, setAwaitingMandate] = useState(false);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		setLoading(true);
		const [subs, invites, awaiting] = await Promise.all([
			supabase
				.from('subscriptions')
				.select('*')
				.eq('lesson_agreement_id', lessonAgreementId)
				.order('created_at', { ascending: false })
				.limit(1),
			supabase
				.from('direct_debit_invitations')
				.select('sent_at')
				.eq('lesson_agreement_id', lessonAgreementId)
				.order('sent_at', { ascending: false })
				.limit(1),
			fetchIsAwaitingMandate(lessonAgreementId),
		]);
		setSubscription(subs.data?.[0] ?? null);
		setLastInviteAt(invites.data?.[0]?.sent_at ?? null);
		setAwaitingMandate(awaiting);
		setLoading(false);
	}, [lessonAgreementId]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { subscription, lastInviteAt, awaitingMandate, loading, refresh };
}
