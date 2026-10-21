import { useState } from 'react';
import { LuCreditCard, LuExternalLink, LuMail, LuRefreshCw, LuTags, LuZap } from 'react-icons/lu';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { formatDbDateToUi } from '@/lib/date/date-format';
import {
	buildSubscriptionActionBody,
	extractPortalUrl,
	resolveSubscriptionActionError,
	resolveSubscriptionActionSuccess,
	resolveSubscriptionStatusBadge,
	SUBSCRIPTION_ACTION_FUNCTIONS,
	shouldShowResendInvitation,
	type SubscriptionAction,
} from '@/lib/subscriptions/subscriptionCardHelpers';

interface SubscriptionCardProps {
	lessonAgreementId: string;
	studentUserId: string;
}

const FORCE_START_CONFIRM =
	'TEST: het bestaande schema wordt geannuleerd en het abonnement start direct met onmiddellijke incasso. Doorgaan?';

/** Stripe subscription status and actions for one agreement with payment method Stripe. */
export function SubscriptionCard({ lessonAgreementId, studentUserId }: SubscriptionCardProps) {
	const { subscription, lastInviteAt, loading, refresh } = useSubscription(lessonAgreementId);
	const [busy, setBusy] = useState<SubscriptionAction | null>(null);
	const badge = resolveSubscriptionStatusBadge(subscription?.status);

	const runAction = async (action: SubscriptionAction) => {
		if (action === 'force-start' && !window.confirm(FORCE_START_CONFIRM)) return;
		setBusy(action);
		const { data, error } = await supabase.functions.invoke(SUBSCRIPTION_ACTION_FUNCTIONS[action], {
			body: buildSubscriptionActionBody(action, lessonAgreementId, studentUserId, window.location.href),
		});
		setBusy(null);
		const message = resolveSubscriptionActionError(action, data, error);
		if (message) {
			toast.error(message);
			return;
		}
		if (action === 'open-portal') {
			const url = extractPortalUrl(data);
			if (url) window.open(url, '_blank', 'noopener,noreferrer');
			return;
		}
		toast.success(resolveSubscriptionActionSuccess(action, data));
		void refresh();
	};

	return (
		<Card className="mt-6 max-w-2xl">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<LuCreditCard className="h-4 w-4" /> Abonnement via Stripe
				</CardTitle>
				<CardDescription>
					Stripe incasseert maandelijks en maakt de facturen. Deze overeenkomst komt niet in SEPA-batches.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{loading ? (
					<p className="text-sm text-muted-foreground">Laden...</p>
				) : (
					<div className="space-y-1 text-sm">
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground">Status:</span>
							{badge ? (
								<Badge variant={badge.variant}>{badge.label}</Badge>
							) : (
								<span>Nog geen abonnement</span>
							)}
						</div>
						{subscription?.current_period_end && (
							<p className="text-muted-foreground">
								Huidige periode tot {formatDbDateToUi(subscription.current_period_end.slice(0, 10))}
							</p>
						)}
						{lastInviteAt && (
							<p className="text-muted-foreground">
								Uitnodiging laatst verstuurd op {formatDbDateToUi(lastInviteAt.slice(0, 10))}
							</p>
						)}
						{subscription?.last_rebuild_error && (
							<p className="text-destructive">Laatste fout: {subscription.last_rebuild_error}</p>
						)}
					</div>
				)}

				<div className="flex flex-wrap gap-2">
					{!loading && shouldShowResendInvitation(subscription) && <Button onClick={() => runAction('send-invite')} disabled={busy !== null}>
						<LuMail className="mr-1.5 h-4 w-4" /> Opnieuw versturen
					</Button>}
					<Button
						variant="outline"
						onClick={() => runAction('open-portal')}
						disabled={busy !== null || !subscription}
					>
						<LuExternalLink className="mr-1.5 h-4 w-4" /> Open klantportaal
					</Button>
					<Button
						variant="outline"
						onClick={() => runAction('rebuild')}
						disabled={busy !== null || !subscription?.stripe_schedule_id}
					>
						<LuTags className="mr-1.5 h-4 w-4" /> Pas nieuwe tarieven toe
					</Button>
					<Button variant="outline" onClick={() => runAction('sync')} disabled={busy !== null}>
						<LuRefreshCw className="mr-1.5 h-4 w-4" /> Synchroniseer
					</Button>
					{import.meta.env.DEV && (
						<Button variant="ghost" onClick={() => runAction('force-start')} disabled={busy !== null}>
							<LuZap className="mr-1.5 h-4 w-4" /> Test: start direct
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
