import { type MutableRefObject, useRef, useState } from 'react';
import { useTipsAutoShow } from '@/components/tips/useTipsAutoShow';
import { useTipsCompletion } from '@/components/tips/useTipsCompletion';
import { useTipsReplay } from '@/components/tips/useTipsReplay';
import { useTipsShellActions } from '@/components/tips/useTipsShellActions';
import type { TipDefinition, TipProgressMap, TipStatus } from '@/types/tips';

export interface TipsSession {
	activeTip: TipDefinition | null;
	activeTipImmediate: boolean;
	browserOpen: boolean;
	setBrowserOpen: (open: boolean) => void;
	dismissActiveTip: () => void;
	resetProgress: () => Promise<{ error: string | null }>;
	onShowTip: (tipId: string) => void;
	onTipsButtonClick: () => void;
}

export function useTipsSession(params: {
	pathname: string;
	userId: string | null;
	progressLoaded: boolean;
	autoIntervalMinutes: number;
	progressRef: MutableRefObject<TipProgressMap>;
	writeStatus: (tipId: string, status: TipStatus) => Promise<void>;
	recordAction: (tipId: string) => Promise<void>;
	bumpSeenAt: (tipId: string) => Promise<void>;
	resetAllProgress: () => Promise<{ error: string | null }>;
}): TipsSession {
	const {
		pathname,
		userId,
		progressLoaded,
		autoIntervalMinutes,
		progressRef,
		writeStatus,
		recordAction,
		bumpSeenAt,
		resetAllProgress,
	} = params;

	const [activeTip, setActiveTip] = useState<TipDefinition | null>(null);
	const [activeTipImmediate, setActiveTipImmediate] = useState(false);
	const [browserOpen, setBrowserOpen] = useState(false);
	const [pendingReplayId, setPendingReplayId] = useState<string | null>(null);
	const autoShownPathRef = useRef<string | null>(null);
	const activeTipRef = useRef(activeTip);
	activeTipRef.current = activeTip;

	useTipsAutoShow({
		pathname,
		progressLoaded,
		userId,
		autoIntervalMinutes,
		progressRef,
		autoShownPathRef,
		setActiveTip,
		setActiveTipImmediate,
	});
	useTipsCompletion({
		userId,
		progressLoaded,
		pathname,
		activeTipRef,
		recordAction,
		setActiveTip,
		setActiveTipImmediate,
	});
	useTipsReplay({
		browserOpen,
		pendingReplayId,
		userId,
		bumpSeenAt,
		setPendingReplayId,
		setActiveTip,
		setActiveTipImmediate,
	});

	const { dismissActiveTip, resetProgress, onShowTip, onTipsButtonClick } = useTipsShellActions({
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
	});

	return {
		activeTip,
		activeTipImmediate,
		browserOpen,
		setBrowserOpen,
		dismissActiveTip,
		resetProgress,
		onShowTip,
		onTipsButtonClick,
	};
}
