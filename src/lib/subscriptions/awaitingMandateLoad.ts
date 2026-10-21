import { supabase } from '@/integrations/supabase/client';
import type { AwaitingMandateRow } from '@/lib/subscriptions/awaitingMandate';

/**
 * The view is newer than the generated types until the user regenerates them;
 * the name cast keeps the query builder typed without `any`.
 */
const AWAITING_VIEW = 'agreements_awaiting_mandate' as string as 'invoices';

/** Rows of `agreements_awaiting_mandate`; RLS limits students to their own agreements. */
export async function fetchAwaitingMandates(studentUserId?: string): Promise<AwaitingMandateRow[]> {
	let query = supabase.from(AWAITING_VIEW).select('*');
	if (studentUserId) query = query.eq('student_user_id', studentUserId);
	const { data, error } = await query;
	if (error) throw new Error(error.message);
	return ((data ?? []) as unknown as AwaitingMandateRow[]).map((r) => ({
		...r,
		days_waiting: Number(r.days_waiting ?? 0),
	}));
}

export async function countAwaitingMandates(): Promise<number> {
	const { count, error } = await supabase.from(AWAITING_VIEW).select('*', { count: 'exact', head: true });
	if (error) return 0;
	return count ?? 0;
}
