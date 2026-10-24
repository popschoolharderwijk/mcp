import {
	type AgendaFullscreenKeyEvent,
	resolveAgendaNavigateKey,
	shouldHandleAgendaFullscreenKey,
} from '@/lib/agenda/agendaFullscreenKeyboard';
import type { TipCompleteOn } from '@/types/tips';

/** Agenda keyboard completion modes; only on `/agenda` (same scope as the agenda panel listeners). */
export function resolveAgendaTipCompleteOnFromKey(
	pathname: string,
	event: AgendaFullscreenKeyEvent,
): TipCompleteOn | null {
	if (pathname !== '/agenda') return null;
	if (shouldHandleAgendaFullscreenKey(event)) return 'agenda-fullscreen-hotkey';
	if (resolveAgendaNavigateKey(event)) return 'agenda-nav-keys';
	return null;
}
