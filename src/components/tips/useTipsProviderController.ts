import { useLocation } from 'react-router-dom';
import { useAppSettingsContext } from '@/components/AppSettingsProvider';
import { useHasUnseenTipsForPage } from '@/components/tips/useHasUnseenTipsForPage';
import { useTipsProgress } from '@/components/tips/useTipsProgress';
import { useTipsSession } from '@/components/tips/useTipsSession';
import { useAuth } from '@/hooks/useAuth';
import type { TipDefinition, TipProgressMap } from '@/types/tips';

export interface TipsProviderController {
	pathname: string;
	tipsEnabled: boolean;
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
	const tipsEnabled = settings.tips.enabled;
	const userId = user?.id ?? null;
	const { progress, progressLoaded, progressRef, writeStatus, recordAction, bumpSeenAt, resetAllProgress } =
		useTipsProgress(userId);

	const session = useTipsSession({
		pathname,
		userId,
		progressLoaded,
		tipsEnabled,
		autoIntervalMinutes: settings.tips.auto_interval_minutes,
		progressRef,
		writeStatus,
		recordAction,
		bumpSeenAt,
		resetAllProgress,
	});

	const hasUnseenTips = useHasUnseenTipsForPage(pathname, progress);

	return {
		pathname,
		tipsEnabled,
		progress,
		hasNewTips: tipsEnabled && hasUnseenTips,
		...session,
	};
}
