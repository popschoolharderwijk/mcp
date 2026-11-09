import type { Tables } from '@/integrations/supabase/types';

export type SubscriptionRow = Tables<'subscriptions'>;

export type SubscriptionStatus = SubscriptionRow['status'];

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
	scheduled: 'Gepland',
	trialing: 'Proefperiode',
	active: 'Actief',
	past_due: 'Achterstallig',
	canceled: 'Opgezegd',
	unpaid: 'Onbetaald',
	incomplete: 'Onvolledig',
	incomplete_expired: 'Verlopen',
	paused: 'Gepauzeerd',
};

export const SUBSCRIPTION_STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
	scheduled: 'secondary',
	trialing: 'secondary',
	active: 'default',
	past_due: 'destructive',
	canceled: 'outline',
	unpaid: 'destructive',
	incomplete: 'secondary',
	incomplete_expired: 'outline',
	paused: 'secondary',
};
