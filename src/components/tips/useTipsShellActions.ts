import { type Dispatch, type MutableRefObject, type SetStateAction, useCallback } from 'react';
import { TIPS_REGISTRY } from '@/lib/tips/tipsRegistry';
import { selectAutoTip, tipTargetIsPresent } from '@/lib/tips/tipsRegistryHelpers';
import type { TipDefinition, TipProgressMap, TipStatus } from '@/types/tips';

export function useTipsShellActions(params: {
	pathname: string;
	progressRef: MutableRefObject<TipProgressMap>;
	activeTip: TipDefinition | null;
	autoShownPathRef: MutableRefObject<string | null>;
	writeStatus: (tipId: string, status: TipStatus) => Promise<void>;
	resetAllProgress: () => Promise<{ error: string | null }>;
	setActiveTip: Dispatch<SetStateAction<TipDefinition | null>>;
	setActiveTipImmediate: Dispatch<SetStateAction<boolean>>;
	setPendingReplayId: Dispatch<SetStateAction<string | null>>;
	setBrowserOpen: Dispatch<SetStateAction<boolean>>;
}) {
	const {
		pathname,
		progressRef,
		activeTip,
		autoShownPathRef,
		writeStatus,
		resetAllProgress,
		setActiveTip,
		setActiveTipImmediate,
		setPendingReplayId,
		setBrowserOpen,
	} = params;

	const dismissActiveTip = useCallback(() => {
		if (!activeTip) return;
		const tipId = activeTip.id;
		setActiveTip(null);
		setActiveTipImmediate(false);
		void writeStatus(tipId, 'dismissed');
	}, [activeTip, writeStatus, setActiveTip, setActiveTipImmediate]);

	const resetProgress = useCallback(async () => {
		const result = await resetAllProgress();
		if (result.error) return result;
		autoShownPathRef.current = null;
		setActiveTip(null);
		setActiveTipImmediate(false);
		return result;
	}, [resetAllProgress, autoShownPathRef, setActiveTip, setActiveTipImmediate]);

	const onShowTip = useCallback(
		(tipId: string) => {
			setPendingReplayId(tipId);
			setBrowserOpen(false);
		},
		[setPendingReplayId, setBrowserOpen],
	);

	const onTipsButtonClick = useCallback(() => {
		const tip = selectAutoTip(TIPS_REGISTRY, pathname, progressRef.current, tipTargetIsPresent);
		if (tip) {
			setPendingReplayId(tip.id);
			return;
		}
		setBrowserOpen(true);
	}, [pathname, progressRef, setPendingReplayId, setBrowserOpen]);

	return { dismissActiveTip, resetProgress, onShowTip, onTipsButtonClick };
}
