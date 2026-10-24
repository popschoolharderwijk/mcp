import { useEffect, useState } from 'react';
import { TIPS_REGISTRY } from '@/lib/tips/tipsRegistry';
import { hasUnseenTipsAwaitingTarget, hasUnseenTipsForPage, tipTargetIsPresent } from '@/lib/tips/tipsRegistryHelpers';
import type { TipProgressMap } from '@/types/tips';

/** Unseen tips for the current page whose targets are present; rechecks while targets mount. */
export function useHasUnseenTipsForPage(pathname: string, progress: TipProgressMap): boolean {
	const [hasNewTips, setHasNewTips] = useState(() =>
		hasUnseenTipsForPage(TIPS_REGISTRY, pathname, progress, tipTargetIsPresent),
	);

	useEffect(() => {
		const recompute = () => hasUnseenTipsForPage(TIPS_REGISTRY, pathname, progress, tipTargetIsPresent);

		setHasNewTips(recompute());

		if (!hasUnseenTipsAwaitingTarget(TIPS_REGISTRY, pathname, progress, tipTargetIsPresent)) {
			return;
		}

		const observer = new MutationObserver(() => {
			setHasNewTips(recompute());
			if (!hasUnseenTipsAwaitingTarget(TIPS_REGISTRY, pathname, progress, tipTargetIsPresent)) {
				observer.disconnect();
			}
		});
		observer.observe(document.body, { childList: true, subtree: true });
		return () => observer.disconnect();
	}, [pathname, progress]);

	return hasNewTips;
}
