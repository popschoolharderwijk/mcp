import { useState } from 'react';
import { LuCreditCard, LuExternalLink, LuMail, LuRefreshCw, LuTags, LuZap } from 'react-icons/lu';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { formatDbDateToUi } from '@/lib/date/date-format';
import { awaitingSentLabel } from '@/lib/subscriptions/awaitingMandateHelpers';
import {
	buildSubscriptionActionBody,
	isPortalActionDisabled,
	isRebuildActionDisabled,
	resolveSubscriptionActionOutcome,
	resolveSubscriptionStatusBadge,
	SUBSCRIPTION_ACTION_FUNCTIONS,
	type SubscriptionAction,
	shouldShowResendAction,
	subscriptionInviteSentDay,
	subscriptionPeriodEndDay,
} from '@/lib/subscriptions/subscriptionCardHelpers';
import type { SubscriptionRow } from '@/types/subscriptions';

interface SubscriptionCardProps {
	lessonAgreementId: string;
	studentUserId: string;
}

const FORCE_START_CONFIRM =
	'TEST: het bestaande schema wordt geannuleerd en het abonnement start direct met onmiddellijke incasso. Doorgaan?';

function StatusLine(props: {
	awaitingMandate: boolean;
	lastInviteAt: string | null;
	status: string | null | undefined;
}) {
	if (props.awaitingMandate) {
		return (
			<div className="flex items-center gap-2">
				<span className="text-muted-foreground">Status:</span>
				<Badge variant="secondary">Wacht op machtiging</Badge>
				<span className="text-muted-foreground">{awaitingSentLabel(props.lastInviteAt)}</span>
			</div>
		);
	}
	const badge = resolveSubscriptionStatusBadge(props.status);
	return (
		<div className="flex items-center gap-2">
			<span className="text-muted-foreground">Status:</span>
			{badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : <span>Nog geen abonnement</span>}
		</div>
	);
}

function PeriodEndLine({ periodEnd }: { periodEnd: string | null }) {
	if (!periodEnd) return null;
	return <p className="text-muted-foreground">Huidige periode tot {formatDbDateToUi(periodEnd)}</p>;
}

function InviteSentLine({ inviteDay }: { inviteDay: string | null }) {
	if (!inviteDay) return null;
	return <p className="text-muted-foreground">Uitnodiging laatst verstuurd op {formatDbDateToUi(inviteDay)}</p>;
}

function SubscriptionDetails(props: {
	awaitingMandate: boolean;
	lastInviteAt: string | null;
	subscription: SubscriptionRow | null;
}) {
	return (
		<div className="space-y-1 text-sm">
			<StatusLine
				awaitingMandate={props.awaitingMandate}
				lastInviteAt={props.lastInviteAt}
				status={props.subscription?.status}
			/>
			<PeriodEndLine periodEnd={subscriptionPeriodEndDay(props.subscription)} />
			<InviteSentLine inviteDay={subscriptionInviteSentDay(props.lastInviteAt, props.awaitingMandate)} />
		</div>
	);
}

function ResendInviteButton(props: { visible: boolean; busy: boolean; onAction: (a: SubscriptionAction) => void }) {
	if (!props.visible) return null;
	return (
		<Button onClick={() => props.onAction('send-invite')} disabled={props.busy}>
			<LuMail className="mr-1.5 h-4 w-4" /> Opnieuw versturen
		</Button>
	);
}

function DevForceStartButton(props: { busy: boolean; onAction: (a: SubscriptionAction) => void }) {
	if (!import.meta.env.DEV) return null;
	return (
		<Button variant="ghost" onClick={() => props.onAction('force-start')} disabled={props.busy}>
			<LuZap className="mr-1.5 h-4 w-4" /> Test: start direct
		</Button>
	);
}

function SubscriptionActions(props: {
	loading: boolean;
	busy: boolean;
	subscription: SubscriptionRow | null;
	onAction: (action: SubscriptionAction) => void;
}) {
	return (
		<div className="flex flex-wrap gap-2">
			<ResendInviteButton
				visible={shouldShowResendAction(props.loading, props.subscription)}
				busy={props.busy}
				onAction={props.onAction}
			/>
			<Button
				variant="outline"
				onClick={() => props.onAction('open-portal')}
				disabled={isPortalActionDisabled(props.busy, props.subscription)}
			>
				<LuExternalLink className="mr-1.5 h-4 w-4" /> Open klantportaal
			</Button>
			<Button
				variant="outline"
				onClick={() => props.onAction('rebuild')}
				disabled={isRebuildActionDisabled(props.busy, props.subscription)}
			>
				<LuTags className="mr-1.5 h-4 w-4" /> Pas nieuwe tarieven toe
			</Button>
			<Button variant="outline" onClick={() => props.onAction('sync')} disabled={props.busy}>
				<LuRefreshCw className="mr-1.5 h-4 w-4" /> Synchroniseer
			</Button>
			<DevForceStartButton busy={props.busy} onAction={props.onAction} />
		</div>
	);
}

async function executeSubscriptionAction(
	action: SubscriptionAction,
	lessonAgreementId: string,
	studentUserId: string,
	refresh: () => void,
): Promise<void> {
	const { data, error } = await supabase.functions.invoke(SUBSCRIPTION_ACTION_FUNCTIONS[action], {
		body: buildSubscriptionActionBody(action, lessonAgreementId, studentUserId, window.location.href),
	});
	const outcome = resolveSubscriptionActionOutcome(action, data, error);
	if (outcome.kind === 'error') {
		toast.error(outcome.message);
		return;
	}
	if (outcome.kind === 'portal') {
		if (outcome.url) window.open(outcome.url, '_blank', 'noopener,noreferrer');
		return;
	}
	toast.success(outcome.message);
	refresh();
}

/** Stripe subscription status and actions for one agreement. */
export function SubscriptionCard({ lessonAgreementId, studentUserId }: SubscriptionCardProps) {
	const { subscription, lastInviteAt, awaitingMandate, loading, refresh } = useSubscription(lessonAgreementId);
	const [busy, setBusy] = useState<SubscriptionAction | null>(null);

	const runAction = async (action: SubscriptionAction) => {
		if (action === 'force-start' && !window.confirm(FORCE_START_CONFIRM)) return;
		setBusy(action);
		await executeSubscriptionAction(action, lessonAgreementId, studentUserId, () => void refresh());
		setBusy(null);
	};

	return (
		<Card className="mt-6 max-w-2xl">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<LuCreditCard className="h-4 w-4" /> Abonnement via Stripe
				</CardTitle>
				<CardDescription>
					Status van de machtiging en maandelijkse incasso voor deze overeenkomst.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{loading ? (
					<p className="text-sm text-muted-foreground">Laden...</p>
				) : (
					<SubscriptionDetails
						awaitingMandate={awaitingMandate}
						lastInviteAt={lastInviteAt}
						subscription={subscription}
					/>
				)}
				<SubscriptionActions
					loading={loading}
					busy={busy !== null}
					subscription={subscription}
					onAction={(action) => void runAction(action)}
				/>
			</CardContent>
		</Card>
	);
}
