export interface KeyboardTarget {
	tagName: string;
	isContentEditable?: boolean;
}

/** True when keyboard focus is in a field where letter shortcuts must not fire. */
export function isTypingTarget(target: KeyboardTarget | null): boolean {
	if (target === null) return false;
	const tag = target.tagName;
	if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
	return Boolean(target.isContentEditable);
}

export function keyboardTargetFromEventTarget(target: EventTarget | null): KeyboardTarget | null {
	if (!(target instanceof HTMLElement)) return null;
	return { tagName: target.tagName, isContentEditable: target.isContentEditable };
}

/** True when the command-palette hotkey should fire (currently `/`; no modifiers, not typing). */
export function shouldOpenCommandPaletteOnHotkey(event: {
	key: string;
	ctrlKey: boolean;
	metaKey: boolean;
	altKey: boolean;
	target: KeyboardTarget | null;
}): boolean {
	if (event.key !== '/') return false;
	if (event.ctrlKey || event.metaKey || event.altKey) return false;
	if (isTypingTarget(event.target)) return false;
	return true;
}
