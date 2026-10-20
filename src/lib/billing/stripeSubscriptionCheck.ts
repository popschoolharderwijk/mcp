import { supabase } from '@/integrations/supabase/client';

export type SubscriptionCheckStatus = 'ok' | 'mismatch' | 'not_started' | 'error';

export interface SubscriptionCheckResult {
	lesson_agreement_id: string;
	status: SubscriptionCheckStatus;
	month?: string;
	expected_cents?: number;
	stripe_cents?: number;
	diff_cents: number;
	error?: string;
}

export interface SubscriptionCheckResponse {
	configured: boolean;
	message?: string;
	results: SubscriptionCheckResult[];
}

export const SUBSCRIPTION_CHECK_LABELS: Record<SubscriptionCheckStatus, string> = {
	ok: 'Klopt',
	mismatch: 'Wijkt af',
	not_started: 'Nog niet gestart',
	error: 'Fout',
};

/** One-line summary for the toast/notice after "Controleer abonnementen". */
export function summarizeSubscriptionCheck(response: SubscriptionCheckResponse): string {
	if (!response.configured) return response.message ?? 'Stripe is nog niet ingesteld';
	if (response.results.length === 0) return 'Geen actieve Stripe-abonnementen gevonden';
	const mismatches = response.results.filter((r) => r.status === 'mismatch').length;
	const errors = response.results.filter((r) => r.status === 'error').length;
	if (mismatches === 0 && errors === 0) return `Alle ${response.results.length} abonnementen kloppen`;
	const parts = [];
	if (mismatches > 0) parts.push(`${mismatches} wijk${mismatches === 1 ? 't' : 'en'} af`);
	if (errors > 0) parts.push(`${errors} met fout`);
	return `${response.results.length} gecontroleerd: ${parts.join(', ')}`;
}

export async function checkStripeSubscriptions(): Promise<SubscriptionCheckResponse | null> {
	const { data, error } = await supabase.functions.invoke<SubscriptionCheckResponse>('check-stripe-subscriptions', {
		body: {},
	});
	if (error || !data) return null;
	return data;
}
