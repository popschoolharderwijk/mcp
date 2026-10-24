import { type Dispatch, type MutableRefObject, type SetStateAction, useEffect } from 'react';
import {
	readLastAutoTipShownAt,
	tipAutoIntervalRemainingMs,
	writeLastAutoTipShownAt,
} from '@/lib/tips/tipAutoIntervalHelpers';
import { TIPS_REGISTRY } from '@/lib/tips/tipsRegistry';
import {
	selectAutoTip,
	tipTargetIsPresent,
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

		const tip = selectAutoTip(TIPS_REGISTRY, pathname, progressRef.current, tipTargetIsPresent);
		if (!tip) {
			autoShownPathRef.current = pathname;
			return;
		}

		const controller = new AbortController();
		let intervalTimer: number | undefined;

		const showAutoTip = async () => {
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

		const tryShowAfterInterval = () => {
			if (controller.signal.aborted) return;
			const remaining = tipAutoIntervalRemainingMs(
				readLastAutoTipShownAt(userId),
				Date.now(),
				autoIntervalMinutes,
			);
			if (remaining > 0) {
				intervalTimer = window.setTimeout(tryShowAfterInterval, remaining);
				return;
			}
			void waitForTipTarget(tip.target, controller.signal).then((found) => {
				if (controller.signal.aborted) return;
				if (!found) {
					autoShownPathRef.current = pathname;
					return;
				}
				void showAutoTip();
			});
		};

		tryShowAfterInterval();

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
