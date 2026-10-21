import { describe, expect, it } from 'bun:test';
import {
	AGENDA_DEFAULT_VIEW,
	agendaUrlStatesMatch,
	buildAgendaUrlSearchParams,
	isAgendaUrlView,
	parseAgendaFullscreenParam,
	parseAgendaUrlState,
} from '../../../src/lib/agenda/agendaUrlState';

const today = new Date(2026, 9, 18, 14, 30, 0);

describe('isAgendaUrlView', () => {
	it('accepts supported calendar views only', () => {
		expect(isAgendaUrlView('week')).toBe(true);
		expect(isAgendaUrlView('day')).toBe(true);
		expect(isAgendaUrlView('month')).toBe(true);
		expect(isAgendaUrlView('agenda')).toBe(true);
		expect(isAgendaUrlView('work_week')).toBe(false);
		expect(isAgendaUrlView('nope')).toBe(false);
		expect(isAgendaUrlView(null)).toBe(false);
	});
});

describe('parseAgendaFullscreenParam', () => {
	it('treats 1 and true as fullscreen', () => {
		expect(parseAgendaFullscreenParam('1')).toBe(true);
		expect(parseAgendaFullscreenParam('true')).toBe(true);
		expect(parseAgendaFullscreenParam('0')).toBe(false);
		expect(parseAgendaFullscreenParam(null)).toBe(false);
	});
});

describe('parseAgendaUrlState', () => {
	it('returns defaults when params are empty', () => {
		const state = parseAgendaUrlState(new URLSearchParams(), today);
		expect(state.view).toBe(AGENDA_DEFAULT_VIEW);
		expect(state.fullscreen).toBe(false);
		expect(state.date).toEqual(today);
	});

	it('reads non-default view, date, and fullscreen', () => {
		const state = parseAgendaUrlState(new URLSearchParams('view=day&date=2026-10-25&fullscreen=1'), today);
		expect(state.view).toBe('day');
		expect(state.fullscreen).toBe(true);
		expect(state.date.getFullYear()).toBe(2026);
		expect(state.date.getMonth()).toBe(9);
		expect(state.date.getDate()).toBe(25);
	});

	it('falls back on invalid view or date', () => {
		const state = parseAgendaUrlState(new URLSearchParams('view=nope&date=bad'), today);
		expect(state.view).toBe('week');
		expect(state.date).toEqual(today);
	});
});

describe('buildAgendaUrlSearchParams', () => {
	it('omits defaults and preserves unrelated keys', () => {
		const current = new URLSearchParams('foo=bar');
		const next = buildAgendaUrlSearchParams(current, { view: 'week', date: today, fullscreen: false }, today);
		expect(next.toString()).toBe('foo=bar');
	});

	it('writes only non-default agenda keys', () => {
		const next = buildAgendaUrlSearchParams(
			new URLSearchParams(),
			{ view: 'month', date: new Date(2026, 9, 25, 9, 0, 0), fullscreen: true },
			today,
		);
		expect(next.get('view')).toBe('month');
		expect(next.get('date')).toBe('2026-10-25');
		expect(next.get('fullscreen')).toBe('1');
	});

	it('removes stale agenda keys when returning to defaults', () => {
		const current = new URLSearchParams('view=day&date=2026-10-25&fullscreen=1&keep=1');
		const next = buildAgendaUrlSearchParams(current, { view: 'week', date: today, fullscreen: false }, today);
		expect(next.toString()).toBe('keep=1');
	});
});

describe('agendaUrlStatesMatch', () => {
	it('compares view, fullscreen, and calendar day only', () => {
		const a = { view: 'week' as const, date: new Date(2026, 9, 18, 8, 0, 0), fullscreen: false };
		const b = { view: 'week' as const, date: new Date(2026, 9, 18, 22, 0, 0), fullscreen: false };
		const c = { view: 'day' as const, date: a.date, fullscreen: false };
		expect(agendaUrlStatesMatch(a, b)).toBe(true);
		expect(agendaUrlStatesMatch(a, c)).toBe(false);
	});
});
