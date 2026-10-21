import { describe, expect, it } from 'bun:test';
import {
	CALENDAR_NAVIGATE,
	resolveAgendaStepDate,
	resolveCalendarNavAriaLabel,
	resolveCalendarNavShortcutLabel,
	resolveCalendarTodayLabel,
} from '../../../src/lib/agenda/calendarToolbarNavigationHelpers';

describe('resolveCalendarTodayLabel', () => {
	it('returns localized label when provided', () => {
		expect(resolveCalendarTodayLabel('Today')).toBe('Today');
	});

	it('falls back to Dutch label', () => {
		expect(resolveCalendarTodayLabel(undefined)).toBe('Vandaag');
	});
});

describe('resolveCalendarNavAriaLabel', () => {
	it('returns localized aria label when provided', () => {
		expect(resolveCalendarNavAriaLabel('Previous', 'Vorige')).toBe('Previous');
	});

	it('falls back to provided default', () => {
		expect(resolveCalendarNavAriaLabel(undefined, 'Vorige')).toBe('Vorige');
	});
});

describe('resolveCalendarNavShortcutLabel', () => {
	it('appends arrow shortcut markers', () => {
		expect(resolveCalendarNavShortcutLabel('Vorige', 'PREV')).toBe('Vorige (←)');
		expect(resolveCalendarNavShortcutLabel('Volgende', 'NEXT')).toBe('Volgende (→)');
		expect(resolveCalendarNavShortcutLabel('Vandaag', 'TODAY')).toBe('Vandaag (↑)');
	});
});

describe('resolveAgendaStepDate', () => {
	const monday = new Date(2026, 9, 12, 10, 0, 0);

	it('steps one week in week view', () => {
		expect(resolveAgendaStepDate(monday, 'week', 'PREV')).toEqual(new Date(2026, 9, 5, 10, 0, 0));
		expect(resolveAgendaStepDate(monday, 'week', 'NEXT')).toEqual(new Date(2026, 9, 19, 10, 0, 0));
	});

	it('steps one day in day view and one month in month view', () => {
		expect(resolveAgendaStepDate(monday, 'day', 'NEXT')).toEqual(new Date(2026, 9, 13, 10, 0, 0));
		expect(resolveAgendaStepDate(monday, 'month', 'PREV')).toEqual(new Date(2026, 8, 12, 10, 0, 0));
	});

	it('steps thirty days in agenda list view', () => {
		expect(resolveAgendaStepDate(monday, 'agenda', 'NEXT')).toEqual(new Date(2026, 10, 11, 10, 0, 0));
	});
});

describe('CALENDAR_NAVIGATE', () => {
	it('exposes stable navigation action constants', () => {
		expect(CALENDAR_NAVIGATE).toEqual({ PREVIOUS: 'PREV', NEXT: 'NEXT', TODAY: 'TODAY', DATE: 'DATE' });
	});
});
