import { type Dispatch, type SetStateAction, useEffect } from 'react';
import { writeLastAutoTipShownAt } from '@/lib/tips/tipAutoIntervalHelpers';
import { TIPS_REGISTRY } from '@/lib/tips/tipsRegistry';
import { waitForTipTarget } from '@/lib/tips/tipsRegistryHelpers';
import type { TipDefinition } from '@/types/tips';

function resolveTipReplaySession(
	browserOpen: boolean,
	pendingReplayId: string | null,
	userId: string | null,
): { tipId: string; userId: string } | null {
	if (browserOpen || !pendingReplayId || !userId) return null;
	return { tipId: pendingReplayId, userId };
}

export function useTipsReplay(params: {
	browserOpen: boolean;
	pendingReplayId: string | null;
	userId: string | null;
	bumpSeenAt: (tipId: string) => Promise<void>;
	setPendingReplayId: Dispatch<SetStateAction<string | null>>;
	setActiveTip: Dispatch<SetStateAction<TipDefinition | null>>;
	setActiveTipImmediate: Dispatch<SetStateAction<boolean>>;
}): void {
	const {
		browserOpen,
		pendingReplayId,
		userId,
		bumpSeenAt,
		setPendingReplayId,
		setActiveTip,
		setActiveTipImmediate,
	} = params;

	useEffect(() => {
		const session = resolveTipReplaySession(browserOpen, pendingReplayId, userId);
		if (!session) return;

		const tip = TIPS_REGISTRY.find((entry) => entry.id === session.tipId) ?? null;
		setPendingReplayId(null);
		if (!tip) return;

		const controller = new AbortController();
		void startTipReplay({
			tip,
			userId: session.userId,
			signal: controller.signal,
			bumpSeenAt,
			setActiveTip,
			setActiveTipImmediate,
		});
		return () => controller.abort();
	}, [browserOpen, pendingReplayId, userId, bumpSeenAt, setPendingReplayId, setActiveTip, setActiveTipImmediate]);
}

async function startTipReplay(params: {
	tip: TipDefinition;
	userId: string;
	signal: AbortSignal;
	bumpSeenAt: (tipId: string) => Promise<void>;
	setActiveTip: Dispatch<SetStateAction<TipDefinition | null>>;
	setActiveTipImmediate: Dispatch<SetStateAction<boolean>>;
}): Promise<void> {
	const found = await waitForTipTarget(params.tip.target, params.signal);
	if (!found) return;
	writeLastAutoTipShownAt(params.userId, Date.now());
	void params.bumpSeenAt(params.tip.id);
	params.setActiveTipImmediate(true);
	params.setActiveTip(params.tip);
}
