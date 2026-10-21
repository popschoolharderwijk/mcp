import { addDays, addMonths, addWeeks } from 'date-fns';
import type { View } from 'react-big-calendar';
import type { AgendaNavigateAction, AgendaNavigateDirection } from '@/lib/agenda/agendaFullscreenKeyboard';

export const CALENDAR_NAVIGATE = { PREVIOUS: 'PREV', NEXT: 'NEXT', TODAY: 'TODAY', DATE: 'DATE' } as const;

/** Default agenda-list span in react-big-calendar (Agenda.DEFAULT_LENGTH). */
const AGENDA_LIST_LENGTH_DAYS = 30;

export function resolveCalendarTodayLabel(messagesToday: unknown): string {
	return typeof messagesToday === 'string' ? messagesToday : 'Vandaag';
}

export function resolveCalendarNavAriaLabel(messagesLabel: unknown, fallback: string): string {
	return String(messagesLabel ?? fallback);
}

/** Label with arrow shortcut for today/prev/next toolbar buttons (UI + aria). */
export function resolveCalendarNavShortcutLabel(label: string, action: AgendaNavigateAction): string {
	if (action === 'PREV') return `${label} (←)`;
	if (action === 'NEXT') return `${label} (→)`;
	return `${label} (↑)`;
}

/** Step currentDate by one view unit — matches react-big-calendar Week/Day/Month/Agenda.navigate. */
export function resolveAgendaStepDate(date: Date, view: View, direction: AgendaNavigateDirection): Date {
	const delta = direction === 'PREV' ? -1 : 1;
	if (view === 'month') return addMonths(date, delta);
	if (view === 'day') return addDays(date, delta);
	if (view === 'agenda') return addDays(date, delta * AGENDA_LIST_LENGTH_DAYS);
	return addWeeks(date, delta);
}
