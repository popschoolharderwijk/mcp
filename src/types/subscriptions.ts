import type { Tables } from '@/integrations/supabase/types';

export type SubscriptionRow = Tables<'subscriptions'>;

export type SubscriptionStatus =
	| 'scheduled'
	| 'trialing'
	| 'active'
	| 'past_due'
	| 'canceled'
	| 'unpaid'
	| 'incomplete'
	| 'incomplete_expired'
	| 'paused';

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
	scheduled: 'Gepland',
	trialing: 'Proefperiode',
	active: 'Actief',
	past_due: 'Achterstallig',
	canceled: 'Geannuleerd',
	unpaid: 'Onbetaald',
	incomplete: 'In behandeling',
	incomplete_expired: 'Verlopen',
	paused: 'Gepauzeerd',
};

export const SUBSCRIPTION_STATUS_VARIANTS: Record<
	SubscriptionStatus,
	'default' | 'secondary' | 'destructive' | 'outline'
> = {
	scheduled: 'secondary',
	trialing: 'secondary',
	active: 'default',
	past_due: 'destructive',
	canceled: 'outline',
	unpaid: 'destructive',
	incomplete: 'secondary',
	incomplete_expired: 'outline',
	paused: 'outline',
};
