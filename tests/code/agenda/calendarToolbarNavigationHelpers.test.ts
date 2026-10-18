import { describe, expect, it } from 'bun:test';
import {
	CALENDAR_NAVIGATE,
	resolveCalendarNavAriaLabel,
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

describe('CALENDAR_NAVIGATE', () => {
	it('exposes stable navigation action constants', () => {
		expect(CALENDAR_NAVIGATE).toEqual({ PREVIOUS: 'PREV', NEXT: 'NEXT', TODAY: 'TODAY', DATE: 'DATE' });
	});
});
