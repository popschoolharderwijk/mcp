const STORAGE_PREFIX = 'mcp:tips:last-auto-at:';

/** Milliseconds until the next auto tip may show; 0 when elapsed or never shown. */
export function tipAutoIntervalRemainingMs(
	lastShownAtMs: number | null,
	nowMs: number,
	intervalMinutes: number,
): number {
	if (lastShownAtMs === null) return 0;
	const intervalMs = Math.max(0, intervalMinutes) * 60_000;
	const remaining = intervalMs - (nowMs - lastShownAtMs);
	return remaining > 0 ? remaining : 0;
}

function storageKey(userId: string): string {
	return `${STORAGE_PREFIX}${userId}`;
}

export function readLastAutoTipShownAt(userId: string): number | null {
	try {
		const raw = localStorage.getItem(storageKey(userId));
		if (raw === null) return null;
		const parsed = Number(raw);
		if (!Number.isFinite(parsed)) return null;
		return parsed;
	} catch {
		return null;
	}
}

export function writeLastAutoTipShownAt(userId: string, atMs: number): void {
	try {
		localStorage.setItem(storageKey(userId), String(atMs));
	} catch {
		// Ignore quota / private-mode failures; interval is best-effort.
	}
}

export function clearLastAutoTipShownAt(userId: string): void {
	try {
		localStorage.removeItem(storageKey(userId));
	} catch {
		// Ignore.
	}
}
