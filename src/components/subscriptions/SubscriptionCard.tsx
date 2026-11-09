import { useState } from 'react';
import { LuCreditCard, LuMail, LuTags } from 'react-icons/lu';
import { toast } from 'sonner';
import { StripeButton } from '@/components/stripe/StripeButton';
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

function ResendInviteButton(props: {
	visible: boolean;
	busy: boolean;
	onAction: (a: SubscriptionAction) => void | Promise<void>;
}) {
	if (!props.visible) return null;
	return (
		<Button onClick={() => void props.onAction('send-invite')} disabled={props.busy}>
			<LuMail className="mr-1.5 h-4 w-4" /> Opnieuw versturen
		</Button>
	);
}

function SubscriptionActions(props: {
	loading: boolean;
	busy: boolean;
	subscription: SubscriptionRow | null;
	onAction: (action: SubscriptionAction) => void | Promise<void>;
	resolvePortalHref: () => Promise<string | null>;
}) {
	return (
		<div className="flex flex-wrap gap-2">
			<ResendInviteButton
				visible={shouldShowResendAction(props.loading, props.subscription)}
				busy={props.busy}
				onAction={props.onAction}
			/>
			<StripeButton
				disabled={isPortalActionDisabled(props.busy, props.subscription)}
				resolveHref={props.resolvePortalHref}
			>
				Klantportaal
			</StripeButton>
			<Button
				variant="outline"
				onClick={() => void props.onAction('rebuild')}
				disabled={isRebuildActionDisabled(props.busy, props.subscription)}
			>
				<LuTags className="mr-1.5 h-4 w-4" /> Pas nieuwe tarieven toe
			</Button>
			<StripeButton disabled={props.busy} onClick={() => props.onAction('sync')}>
				Synchroniseer
			</StripeButton>
		</div>
	);
}

async function resolveCustomerPortalHref(studentUserId: string): Promise<string | null> {
	const { data, error } = await supabase.functions.invoke(SUBSCRIPTION_ACTION_FUNCTIONS['open-portal'], {
		body: buildSubscriptionActionBody('open-portal', '', studentUserId, window.location.href),
	});
	const outcome = await resolveSubscriptionActionOutcome('open-portal', data, error);
	if (outcome.kind === 'error') {
		toast.error(outcome.message);
		return null;
	}
	if (outcome.kind !== 'portal') return null;
	return outcome.url;
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
	const outcome = await resolveSubscriptionActionOutcome(action, data, error);
	if (outcome.kind === 'error') {
		toast.error(outcome.message);
		return;
	}
	if (outcome.kind !== 'success') return;
	toast.success(outcome.message);
	refresh();
}

/** Stripe subscription status and actions for one agreement. */
export function SubscriptionCard({ lessonAgreementId, studentUserId }: SubscriptionCardProps) {
	const { subscription, lastInviteAt, awaitingMandate, loading, refresh } = useSubscription(lessonAgreementId);
	const [busy, setBusy] = useState<SubscriptionAction | null>(null);

	const runAction = async (action: SubscriptionAction) => {
		setBusy(action);
		await executeSubscriptionAction(action, lessonAgreementId, studentUserId, () => void refresh());
		setBusy(null);
	};

	const resolvePortalHref = async () => {
		setBusy('open-portal');
		const url = await resolveCustomerPortalHref(studentUserId);
		setBusy(null);
		return url;
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
					onAction={runAction}
					resolvePortalHref={resolvePortalHref}
				/>
			</CardContent>
		</Card>
	);
}
