import { type Dispatch, type MutableRefObject, type SetStateAction, useEffect } from 'react';
import type { AgendaFullscreenKeyEvent } from '@/lib/agenda/agendaFullscreenKeyboard';
import { keyboardTargetFromEventTarget, shouldOpenCommandPaletteOnSlashKey } from '@/lib/keyboard/keyboardHelpers';
import { resolveAgendaTipIdFromKey } from '@/lib/tips/tipKeyboardCompleteHelpers';
import { TIPS_REGISTRY } from '@/lib/tips/tipsRegistry';
import type { TipDefinition } from '@/types/tips';

function resolveTipIdFromKeyEvent(pathname: string, keyEvent: AgendaFullscreenKeyEvent): string | null {
	if (shouldOpenCommandPaletteOnSlashKey(keyEvent)) return 'command-search-slash';
	return resolveAgendaTipIdFromKey(pathname, keyEvent);
}

function resolveTipIdFromTipTarget(target: string | null): string | null {
	if (!target) return null;
	return TIPS_REGISTRY.find((entry) => entry.target === target)?.id ?? null;
}

export function useTipsCompletion(params: {
	userId: string | null;
	progressLoaded: boolean;
	pathname: string;
	activeTipRef: MutableRefObject<TipDefinition | null>;
	recordAction: (tipId: string) => Promise<void>;
	setActiveTip: Dispatch<SetStateAction<TipDefinition | null>>;
	setActiveTipImmediate: Dispatch<SetStateAction<boolean>>;
}): void {
	const { userId, progressLoaded, pathname, activeTipRef, recordAction, setActiveTip, setActiveTipImmediate } =
		params;

	useEffect(() => {
		if (!userId || !progressLoaded) return;

		const markAction = (tipId: string) => {
			if (activeTipRef.current?.id === tipId) {
				setActiveTip(null);
				setActiveTipImmediate(false);
			}
			void recordAction(tipId);
		};

		const onKeyDown = (event: KeyboardEvent) => {
			const tipId = resolveTipIdFromKeyEvent(pathname, {
				key: event.key,
				ctrlKey: event.ctrlKey,
				metaKey: event.metaKey,
				altKey: event.altKey,
				target: keyboardTargetFromEventTarget(event.target),
			});
			if (tipId) markAction(tipId);
		};

		const onClick = (event: MouseEvent) => {
			const el = event.target instanceof Element ? event.target.closest('[data-tip-target]') : null;
			const tipId = resolveTipIdFromTipTarget(
				el instanceof HTMLElement ? el.getAttribute('data-tip-target') : null,
			);
			if (tipId) markAction(tipId);
		};

		document.addEventListener('keydown', onKeyDown);
		document.addEventListener('click', onClick, true);
		return () => {
			document.removeEventListener('keydown', onKeyDown);
			document.removeEventListener('click', onClick, true);
		};
	}, [userId, progressLoaded, recordAction, pathname, activeTipRef, setActiveTip, setActiveTipImmediate]);
}
