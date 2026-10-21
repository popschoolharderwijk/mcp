import type { View } from 'react-big-calendar';
import { formatDateToDb, now } from '@/lib/date/date-format';
import { parseDbDateValue } from '@/lib/date/datePickerHelpers';

const AGENDA_URL_VIEW_KEY = 'view';
const AGENDA_URL_DATE_KEY = 'date';
const AGENDA_URL_FULLSCREEN_KEY = 'fullscreen';

export const AGENDA_DEFAULT_VIEW: View = 'week';

const AGENDA_URL_VIEWS = new Set<View>(['month', 'week', 'day', 'agenda']);

export interface AgendaUrlState {
	view: View;
	date: Date;
	fullscreen: boolean;
}

export function isAgendaUrlView(value: string | null | undefined): value is View {
	return value != null && AGENDA_URL_VIEWS.has(value as View);
}

export function parseAgendaFullscreenParam(value: string | null): boolean {
	return value === '1' || value === 'true';
}

/** Read agenda UI state from search params; missing/invalid keys fall back to defaults. */
export function parseAgendaUrlState(params: URLSearchParams, today: Date = now()): AgendaUrlState {
	const viewParam = params.get(AGENDA_URL_VIEW_KEY);
	const view = isAgendaUrlView(viewParam) ? viewParam : AGENDA_DEFAULT_VIEW;
	const date = parseDbDateValue(params.get(AGENDA_URL_DATE_KEY)) ?? today;
	const fullscreen = parseAgendaFullscreenParam(params.get(AGENDA_URL_FULLSCREEN_KEY));
	return { view, date, fullscreen };
}

/**
 * Build search params with only non-default agenda keys.
 * Preserves unrelated query keys from `current`.
 */
export function buildAgendaUrlSearchParams(
	current: URLSearchParams,
	state: AgendaUrlState,
	today: Date = now(),
): URLSearchParams {
	const next = new URLSearchParams(current);
	next.delete(AGENDA_URL_VIEW_KEY);
	next.delete(AGENDA_URL_DATE_KEY);
	next.delete(AGENDA_URL_FULLSCREEN_KEY);

	if (state.view !== AGENDA_DEFAULT_VIEW) {
		next.set(AGENDA_URL_VIEW_KEY, state.view);
	}
	if (formatDateToDb(state.date) !== formatDateToDb(today)) {
		next.set(AGENDA_URL_DATE_KEY, formatDateToDb(state.date));
	}
	if (state.fullscreen) {
		next.set(AGENDA_URL_FULLSCREEN_KEY, '1');
	}

	return next;
}

export function agendaUrlStatesMatch(a: AgendaUrlState, b: AgendaUrlState): boolean {
	return a.view === b.view && a.fullscreen === b.fullscreen && formatDateToDb(a.date) === formatDateToDb(b.date);
}
