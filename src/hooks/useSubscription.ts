import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SubscriptionRow } from '@/types/subscriptions';

export function pickSubscriptionSnapshot(
	subs: SubscriptionRow[] | null | undefined,
	inviteSentAt: string | null | undefined,
): { subscription: SubscriptionRow | null; lastInviteAt: string | null; awaitingMandate: boolean } {
	const subscription = subs?.[0] ?? null;
	return {
		subscription,
		lastInviteAt: inviteSentAt ?? null,
		awaitingMandate: !subscription?.stripe_schedule_id && !subscription?.stripe_subscription_id,
	};
}

/** Latest Stripe subscription + last invitation date for one lesson agreement. */
export function useSubscription(lessonAgreementId: string) {
	const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
	const [lastInviteAt, setLastInviteAt] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		setLoading(true);
		const [subs, invites] = await Promise.all([
			supabase
				.from('subscriptions')
				.select('*')
				.eq('lesson_agreement_id', lessonAgreementId)
				.order('created_at', { ascending: false })
				.limit(1),
			supabase
				.from('stripe_checkout_invitations')
				.select('sent_at')
				.eq('lesson_agreement_id', lessonAgreementId)
				.order('sent_at', { ascending: false })
				.limit(1),
		]);
		const snap = pickSubscriptionSnapshot(subs.data as SubscriptionRow[] | null, invites.data?.[0]?.sent_at);
		setSubscription(snap.subscription);
		setLastInviteAt(snap.lastInviteAt);
		setLoading(false);
	}, [lessonAgreementId]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const awaitingMandate = !subscription?.stripe_schedule_id && !subscription?.stripe_subscription_id;
	return { subscription, lastInviteAt, awaitingMandate, loading, refresh };
}
