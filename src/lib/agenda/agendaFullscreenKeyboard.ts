import { isTypingTarget, type KeyboardTarget, keyboardTargetFromEventTarget } from '@/lib/keyboard/keyboardHelpers';

export interface AgendaFullscreenKeyEvent {
	key: string;
	ctrlKey: boolean;
	metaKey: boolean;
	altKey: boolean;
	target: KeyboardTarget | null;
}

/** True when F should toggle agenda fullscreen (no modifiers, not typing). */
export function shouldHandleAgendaFullscreenKey(event: AgendaFullscreenKeyEvent): boolean {
	if (event.key !== 'f' && event.key !== 'F') return false;
	if (event.ctrlKey || event.metaKey || event.altKey) return false;
	if (isTypingTarget(event.target)) return false;
	return true;
}

export function shouldToggleAgendaFullscreen(event: KeyboardEvent): boolean {
	return shouldHandleAgendaFullscreenKey({
		key: event.key,
		ctrlKey: event.ctrlKey,
		metaKey: event.metaKey,
		altKey: event.altKey,
		target: keyboardTargetFromEventTarget(event.target),
	});
}

export type AgendaNavigateDirection = 'PREV' | 'NEXT';
export type AgendaNavigateAction = AgendaNavigateDirection | 'TODAY';

/** Arrow keys → PREV / NEXT / TODAY (no modifiers, not typing). */
export function resolveAgendaNavigateKey(event: AgendaFullscreenKeyEvent): AgendaNavigateAction | null {
	if (event.ctrlKey || event.metaKey || event.altKey) return null;
	if (isTypingTarget(event.target)) return null;
	if (event.key === 'ArrowLeft') return 'PREV';
	if (event.key === 'ArrowRight') return 'NEXT';
	if (event.key === 'ArrowUp') return 'TODAY';
	return null;
}

export function resolveAgendaNavigateFromKeyboard(event: KeyboardEvent): AgendaNavigateAction | null {
	return resolveAgendaNavigateKey({
		key: event.key,
		ctrlKey: event.ctrlKey,
		metaKey: event.metaKey,
		altKey: event.altKey,
		target: keyboardTargetFromEventTarget(event.target),
	});
}
