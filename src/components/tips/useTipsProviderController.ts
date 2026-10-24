import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppSettingsContext } from '@/components/AppSettingsProvider';
import { useTipsAutoShow } from '@/components/tips/useTipsAutoShow';
import { useTipsCompletion } from '@/components/tips/useTipsCompletion';
import { useTipsProgress } from '@/components/tips/useTipsProgress';
import { useTipsReplay } from '@/components/tips/useTipsReplay';
import { useTipsShellActions } from '@/components/tips/useTipsShellActions';
import { useAuth } from '@/hooks/useAuth';
import { TIPS_REGISTRY } from '@/lib/tips/tipsRegistry';
import { hasUnseenTipsForPage, tipTargetIsPresent } from '@/lib/tips/tipsRegistryHelpers';
import type { TipDefinition, TipProgressMap } from '@/types/tips';

export interface TipsProviderController {
	pathname: string;
	progress: TipProgressMap;
	hasNewTips: boolean;
	onTipsButtonClick: () => void;
	resetProgress: () => Promise<{ error: string | null }>;
	activeTip: TipDefinition | null;
	activeTipImmediate: boolean;
	browserOpen: boolean;
	setBrowserOpen: (open: boolean) => void;
	dismissActiveTip: () => void;
	onShowTip: (tipId: string) => void;
}

export function useTipsProviderController(): TipsProviderController {
	const { user } = useAuth();
	const { pathname } = useLocation();
	const { settings } = useAppSettingsContext();
	const userId = user?.id ?? null;
	const { progress, progressLoaded, progressRef, writeStatus, recordAction, bumpSeenAt, resetAllProgress } =
		useTipsProgress(userId);

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
		autoIntervalMinutes: settings.tips.auto_interval_minutes,
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
		pathname,
		progress,
		hasNewTips: hasUnseenTipsForPage(TIPS_REGISTRY, pathname, progress, tipTargetIsPresent),
		onTipsButtonClick,
		resetProgress,
		activeTip,
		activeTipImmediate,
		browserOpen,
		setBrowserOpen,
		dismissActiveTip,
		onShowTip,
	};
}
