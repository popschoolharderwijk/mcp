export interface AgendaKeyboardTarget {
	tagName: string;
	isContentEditable?: boolean;
}

/** True when keyboard focus is in a field where letter shortcuts must not fire. */
export function isTypingTarget(target: AgendaKeyboardTarget | null): boolean {
	if (target === null) return false;
	const tag = target.tagName;
	if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
	return Boolean(target.isContentEditable);
}

function agendaKeyboardTargetFromEventTarget(target: EventTarget | null): AgendaKeyboardTarget | null {
	if (!(target instanceof HTMLElement)) return null;
	return { tagName: target.tagName, isContentEditable: target.isContentEditable };
}

export interface AgendaFullscreenKeyEvent {
	key: string;
	ctrlKey: boolean;
	metaKey: boolean;
	altKey: boolean;
	target: AgendaKeyboardTarget | null;
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
		target: agendaKeyboardTargetFromEventTarget(event.target),
	});
}
