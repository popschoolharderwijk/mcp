import { createContext, type ReactNode, useContext } from 'react';
import { TipSpotlight } from '@/components/tips/TipSpotlight';
import { TipsBrowserDialog } from '@/components/tips/TipsBrowserDialog';
import { TipsNavButton } from '@/components/tips/TipsNavButton';
import { useTipsProviderController } from '@/components/tips/useTipsProviderController';
import type { TipProgressMap } from '@/types/tips';

interface TipsContextValue {
	tipsEnabled: boolean;
	progress: TipProgressMap;
	hasNewTips: boolean;
	onTipsButtonClick: () => void;
	resetProgress: () => Promise<{ error: string | null }>;
}

const TipsContext = createContext<TipsContextValue | null>(null);

export function useTips(): TipsContextValue {
	const ctx = useContext(TipsContext);
	if (!ctx) throw new Error('useTips must be used within TipsProvider');
	return ctx;
}

export function TipsProvider({ children }: { children: ReactNode }) {
	const ctrl = useTipsProviderController();

	return (
		<TipsContext.Provider
			value={{
				tipsEnabled: ctrl.tipsEnabled,
				progress: ctrl.progress,
				hasNewTips: ctrl.hasNewTips,
				onTipsButtonClick: ctrl.onTipsButtonClick,
				resetProgress: ctrl.resetProgress,
			}}
		>
			{children}
			{ctrl.tipsEnabled && ctrl.activeTip ? (
				<TipSpotlight
					key={ctrl.activeTip.id}
					tip={ctrl.activeTip}
					immediate={ctrl.activeTipImmediate}
					onDismiss={ctrl.dismissActiveTip}
				/>
			) : null}
			{ctrl.tipsEnabled ? (
				<TipsBrowserDialog
					open={ctrl.browserOpen}
					onOpenChange={ctrl.setBrowserOpen}
					pathname={ctrl.pathname}
					progress={ctrl.progress}
					onShowTip={ctrl.onShowTip}
				/>
			) : null}
		</TipsContext.Provider>
	);
}

export function TipsNavButtonConnected() {
	const { tipsEnabled, hasNewTips, onTipsButtonClick } = useTips();
	if (!tipsEnabled) return null;
	return <TipsNavButton hasNewTips={hasNewTips} onClick={onTipsButtonClick} />;
}
