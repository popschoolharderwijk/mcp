import { supabase } from '@/integrations/supabase/client';

export type SubscriptionCheckStatus = 'ok' | 'mismatch' | 'not_started' | 'error' | 'duplicate';

export interface SubscriptionCheckResult {
	lesson_agreement_id: string;
	status: SubscriptionCheckStatus;
	month?: string;
	expected_cents?: number;
	stripe_cents?: number;
	diff_cents: number;
	error?: string;
}

export interface SubscriptionCheckDuplicate {
	lesson_agreement_id: string;
	schedule_ids: string[];
	keep_schedule_id: string;
}

export interface SubscriptionCheckFixed {
	lesson_agreement_id: string;
	kept: string;
	cancelled: string[];
}

export interface SubscriptionCheckResponse {
	configured: boolean;
	message?: string;
	results: SubscriptionCheckResult[];
	duplicates?: SubscriptionCheckDuplicate[];
	fixed?: SubscriptionCheckFixed[];
}

export const SUBSCRIPTION_CHECK_LABELS: Record<SubscriptionCheckStatus, string> = {
	ok: 'Klopt',
	mismatch: 'Wijkt af',
	not_started: 'Nog niet gestart',
	error: 'Fout',
	duplicate: 'Dubbel',
};

/** One-line summary for the toast/notice after "Controleer abonnementen". */
export function summarizeSubscriptionCheck(response: SubscriptionCheckResponse): string {
	if (!response.configured) return response.message ?? 'Stripe is nog niet ingesteld';
	if (response.results.length === 0 && (response.duplicates?.length ?? 0) === 0) {
		return 'Geen actieve Stripe-abonnementen gevonden';
	}
	const mismatches = response.results.filter((r) => r.status === 'mismatch').length;
	const errors = response.results.filter((r) => r.status === 'error').length;
	const duplicates = response.duplicates?.length ?? 0;
	if (mismatches === 0 && errors === 0 && duplicates === 0) {
		return `Alle ${response.results.length} abonnementen kloppen`;
	}
	const parts = [];
	if (mismatches > 0) parts.push(`${mismatches} wijk${mismatches === 1 ? 't' : 'en'} af`);
	if (errors > 0) parts.push(`${errors} met fout`);
	if (duplicates > 0) parts.push(`${duplicates} met dubbele schema's in Stripe`);
	return `${response.results.length} gecontroleerd: ${parts.join(', ')}`;
}

/** Summary after "Herstel dubbele abonnementen". */
export function summarizeDuplicateFix(fixed: SubscriptionCheckFixed[]): string {
	const cancelled = fixed.reduce((sum, f) => sum + f.cancelled.length, 0);
	if (cancelled === 0) return 'Geen dubbele schema\'s gevonden';
	return `${cancelled} dubbel${cancelled === 1 ? '' : 'e'} schema${cancelled === 1 ? '' : "'s"} geannuleerd in Stripe`;
}

export async function checkStripeSubscriptions(options?: {
	fixDuplicates?: boolean;
}): Promise<SubscriptionCheckResponse | null> {
	const { data, error } = await supabase.functions.invoke<SubscriptionCheckResponse>('check-stripe-subscriptions', {
		body: options?.fixDuplicates ? { fix_duplicates: true } : {},
	});
	if (error || !data) return null;
	return data;
}
