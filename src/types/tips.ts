/** Tip progress status stored in `user_tip_progress.status`. */
export type TipStatus = 'dismissed' | 'completed';

export type TipCompleteOn = 'slash-search' | 'target-click' | 'agenda-nav-keys';

export interface TipDefinition {
	id: string;
	title: string;
	body: string;
	/** Route pathnames that match, or `*` for every dashboard route. */
	routes: string[];
	/** Value of `[data-tip-target="…"]` on the highlighted element. */
	target: string;
	completeOn: TipCompleteOn;
}

export interface TipProgressEntry {
	status: TipStatus;
	/** ISO timestamp from `user_tip_progress.updated_at`. */
	updatedAt: string;
	/** ISO timestamp from `user_tip_progress.last_action_at`, or null if never acted. */
	lastActionAt: string | null;
}

/** Map of tip id → progress for the current user. */
export type TipProgressMap = Record<string, TipProgressEntry>;
