import { type Dispatch, type MutableRefObject, type SetStateAction, useEffect } from 'react';
import {
	readLastAutoTipShownAt,
	tipAutoIntervalRemainingMs,
	writeLastAutoTipShownAt,
} from '@/lib/tips/tipAutoIntervalHelpers';
import { TIPS_REGISTRY } from '@/lib/tips/tipsRegistry';
import {
	hasUnseenTipsAwaitingTarget,
	matchesRoute,
	selectAutoTip,
	tipTargetIsPresent,
	waitForAnyTipTarget,
	waitForTipTarget,
	waitUntilNoRadixDialog,
} from '@/lib/tips/tipsRegistryHelpers';
import type { TipDefinition, TipProgressMap } from '@/types/tips';

function canCommitAutoTipShow(params: {
	aborted: boolean;
	dialogClear: boolean;
	alreadyShownPath: string | null;
	pathname: string;
}): boolean {
	if (params.aborted) return false;
	if (!params.dialogClear) return false;
	return params.alreadyShownPath !== params.pathname;
}

async function resolveAutoTip(
	pathname: string,
	progress: TipProgressMap,
	signal: AbortSignal,
): Promise<TipDefinition | null> {
	const selected = selectAutoTip(TIPS_REGISTRY, pathname, progress, tipTargetIsPresent);
	if (selected) return selected;
	if (!hasUnseenTipsAwaitingTarget(TIPS_REGISTRY, pathname, progress, tipTargetIsPresent)) {
		return null;
	}
	const awaitingTargets = TIPS_REGISTRY.filter((tip) => !progress[tip.id] && matchesRoute(tip, pathname)).map(
		(tip) => tip.target,
	);
	const found = await waitForAnyTipTarget(awaitingTargets, signal);
	if (!found) return null;
	return selectAutoTip(TIPS_REGISTRY, pathname, progress, tipTargetIsPresent);
}

export function useTipsAutoShow(params: {
	pathname: string;
	progressLoaded: boolean;
	userId: string | null;
	autoIntervalMinutes: number;
	progressRef: MutableRefObject<TipProgressMap>;
	autoShownPathRef: MutableRefObject<string | null>;
	setActiveTip: Dispatch<SetStateAction<TipDefinition | null>>;
	setActiveTipImmediate: Dispatch<SetStateAction<boolean>>;
}): void {
	const {
		pathname,
		progressLoaded,
		userId,
		autoIntervalMinutes,
		progressRef,
		autoShownPathRef,
		setActiveTip,
		setActiveTipImmediate,
	} = params;

	useEffect(() => {
		setActiveTip(null);
		setActiveTipImmediate(false);
		autoShownPathRef.current = null;

		if (!progressLoaded || !userId) return;

		const controller = new AbortController();
		let intervalTimer: number | undefined;

		const showAutoTip = async (tip: TipDefinition) => {
			const dialogClear = await waitUntilNoRadixDialog(controller.signal);
			if (
				!canCommitAutoTipShow({
					aborted: controller.signal.aborted,
					dialogClear,
					alreadyShownPath: autoShownPathRef.current,
					pathname,
				})
			) {
				return;
			}
			autoShownPathRef.current = pathname;
			writeLastAutoTipShownAt(userId, Date.now());
			setActiveTipImmediate(false);
			setActiveTip(tip);
		};

		const tryShowAfterInterval = (tip: TipDefinition) => {
			if (controller.signal.aborted) return;
			const remaining = tipAutoIntervalRemainingMs(
				readLastAutoTipShownAt(userId),
				Date.now(),
				autoIntervalMinutes,
			);
			if (remaining > 0) {
				intervalTimer = window.setTimeout(() => tryShowAfterInterval(tip), remaining);
				return;
			}
			void waitForTipTarget(tip.target, controller.signal).then((found) => {
				if (controller.signal.aborted) return;
				if (!found) {
					autoShownPathRef.current = pathname;
					return;
				}
				void showAutoTip(tip);
			});
		};

		void resolveAutoTip(pathname, progressRef.current, controller.signal).then((tip) => {
			if (controller.signal.aborted) return;
			if (!tip) {
				autoShownPathRef.current = pathname;
				return;
			}
			tryShowAfterInterval(tip);
		});

		return () => {
			controller.abort();
			if (intervalTimer !== undefined) window.clearTimeout(intervalTimer);
		};
	}, [
		pathname,
		progressLoaded,
		userId,
		autoIntervalMinutes,
		progressRef,
		autoShownPathRef,
		setActiveTip,
		setActiveTipImmediate,
	]);
}
