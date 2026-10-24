import {
	type AgendaFullscreenKeyEvent,
	resolveAgendaNavigateKey,
	shouldHandleAgendaFullscreenKey,
} from '@/lib/agenda/agendaFullscreenKeyboard';

export type AgendaTipIdFromKey = 'agenda-fullscreen' | 'agenda-nav-keyboard';

/** Agenda tip ids completed by keyboard; only on `/agenda` (same scope as the agenda panel listeners). */
export function resolveAgendaTipIdFromKey(
	pathname: string,
	event: AgendaFullscreenKeyEvent,
): AgendaTipIdFromKey | null {
	if (pathname !== '/agenda') return null;
	if (shouldHandleAgendaFullscreenKey(event)) return 'agenda-fullscreen';
	if (resolveAgendaNavigateKey(event)) return 'agenda-nav-keyboard';
	return null;
}
