import { supabase } from '@/integrations/supabase/client';
import { mapTipProgressRows } from '@/lib/tips/tipProgressHelpers';
import type { TipProgressMap, TipStatus } from '@/types/tips';

export async function loadTipProgress(): Promise<TipProgressMap> {
	const { data, error } = await supabase
		.from('user_tip_progress')
		.select('tip_id, status, updated_at, last_action_at');
	if (error || !data) return {};
	return mapTipProgressRows(data);
}

export async function upsertTipProgress(
	userId: string,
	tipId: string,
	status: TipStatus,
	lastActionAt: string | null,
): Promise<{ error: string | null }> {
	const { error } = await supabase.from('user_tip_progress').upsert(
		{
			user_id: userId,
			tip_id: tipId,
			status,
			updated_at: new Date().toISOString(),
			last_action_at: lastActionAt,
		},
		{ onConflict: 'user_id,tip_id' },
	);
	return { error: error?.message ?? null };
}

/** Mark tip completed and stamp last_action_at (every action, including repeats). */
export async function recordTipAction(userId: string, tipId: string): Promise<{ error: string | null }> {
	const now = new Date().toISOString();
	const { error } = await supabase.from('user_tip_progress').upsert(
		{
			user_id: userId,
			tip_id: tipId,
			status: 'completed',
			updated_at: now,
			last_action_at: now,
		},
		{ onConflict: 'user_id,tip_id' },
	);
	return { error: error?.message ?? null };
}

export async function resetTipProgress(userId: string): Promise<{ error: string | null }> {
	const { error } = await supabase.from('user_tip_progress').delete().eq('user_id', userId);
	return { error: error?.message ?? null };
}
