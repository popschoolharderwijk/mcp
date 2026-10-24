import type { TipProgressEntry, TipProgressMap, TipStatus } from '@/types/tips';

export interface TipProgressRow {
	tip_id: string;
	status: string;
	updated_at: string;
	last_action_at: string | null;
}

/** Map DB rows into the in-memory progress map; ignore unknown statuses. */
export function mapTipProgressRows(rows: readonly TipProgressRow[]): TipProgressMap {
	const map: TipProgressMap = {};
	for (const row of rows) {
		if (row.status !== 'dismissed' && row.status !== 'completed') continue;
		map[row.tip_id] = {
			status: row.status,
			updatedAt: row.updated_at,
			lastActionAt: row.last_action_at,
		};
	}
	return map;
}

/** Skip upsert when already completed, or when status is unchanged. */
export function shouldSkipTipStatusWrite(current: TipProgressEntry | undefined, nextStatus: TipStatus): boolean {
	if (current?.status === 'completed') return true;
	return current?.status === nextStatus;
}
