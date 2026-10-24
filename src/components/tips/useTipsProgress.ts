import { useCallback, useEffect, useRef, useState } from 'react';
import { clearLastAutoTipShownAt } from '@/lib/tips/tipAutoIntervalHelpers';
import { loadTipProgress, recordTipAction, resetTipProgress, upsertTipProgress } from '@/lib/tips/tipProgress';
import { shouldSkipTipStatusWrite } from '@/lib/tips/tipProgressHelpers';
import type { TipProgressEntry, TipProgressMap, TipStatus } from '@/types/tips';

function entryAfterStatusWrite(
	current: TipProgressEntry | undefined,
	status: TipStatus,
	updatedAt: string,
): TipProgressEntry {
	return {
		status,
		updatedAt,
		lastActionAt: current?.lastActionAt ?? null,
	};
}

function entryAfterTipAction(updatedAt: string): TipProgressEntry {
	return {
		status: 'completed',
		updatedAt,
		lastActionAt: updatedAt,
	};
}

export function useTipsProgress(userId: string | null) {
	const [progress, setProgress] = useState<TipProgressMap>({});
	const [progressLoaded, setProgressLoaded] = useState(false);
	const progressRef = useRef(progress);
	progressRef.current = progress;

	useEffect(() => {
		if (!userId) {
			setProgress({});
			setProgressLoaded(false);
			return;
		}
		let cancelled = false;
		setProgressLoaded(false);
		void loadTipProgress().then((map) => {
			if (cancelled) return;
			setProgress(map);
			setProgressLoaded(true);
		});
		return () => {
			cancelled = true;
		};
	}, [userId]);

	const writeStatus = useCallback(
		async (tipId: string, status: TipStatus) => {
			if (!userId) return;
			const current = progressRef.current[tipId];
			if (shouldSkipTipStatusWrite(current, status)) return;
			const updatedAt = new Date().toISOString();
			const next = entryAfterStatusWrite(current, status, updatedAt);
			setProgress((prev) => ({ ...prev, [tipId]: next }));
			await upsertTipProgress(userId, tipId, next.status, next.lastActionAt);
		},
		[userId],
	);

	const recordAction = useCallback(
		async (tipId: string) => {
			if (!userId) return;
			const updatedAt = new Date().toISOString();
			const next = entryAfterTipAction(updatedAt);
			setProgress((prev) => ({ ...prev, [tipId]: next }));
			await recordTipAction(userId, tipId);
		},
		[userId],
	);

	const bumpSeenAt = useCallback(
		async (tipId: string) => {
			if (!userId) return;
			const current = progressRef.current[tipId];
			if (!current) return;
			const updatedAt = new Date().toISOString();
			const next = entryAfterStatusWrite(current, current.status, updatedAt);
			setProgress((prev) => ({ ...prev, [tipId]: next }));
			await upsertTipProgress(userId, tipId, next.status, next.lastActionAt);
		},
		[userId],
	);

	const resetAllProgress = useCallback(async () => {
		if (!userId) return { error: 'Niet ingelogd' };
		const { error } = await resetTipProgress(userId);
		if (error) return { error };
		clearLastAutoTipShownAt(userId);
		setProgress({});
		return { error: null };
	}, [userId]);

	return {
		progress,
		progressLoaded,
		progressRef,
		writeStatus,
		recordAction,
		bumpSeenAt,
		resetAllProgress,
	};
}
