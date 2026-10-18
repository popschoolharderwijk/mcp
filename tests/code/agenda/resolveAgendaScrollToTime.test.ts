import { describe, expect, it } from 'bun:test';
import { resolveAgendaTimeGrid } from '../../../src/lib/agenda/resolveAgendaScrollToTime';
import { AVAILABILITY_CONFIG } from '../../../src/lib/availability';

describe('resolveAgendaTimeGrid', () => {
	it('uses the earliest clock time among events in the view', () => {
		const result = resolveAgendaTimeGrid([
			{ start: new Date('2026-02-17T16:30:00') },
			{ start: new Date('2026-02-18T10:15:00') },
			{ start: new Date('2026-02-19T14:00:00') },
		]);

		expect(result.scrollToTime.getHours()).toBe(10);
		expect(result.scrollToTime.getMinutes()).toBe(15);
		expect(result.min.getHours()).toBe(AVAILABILITY_CONFIG.START_HOUR);
		expect(result.max.getHours()).toBe(AVAILABILITY_CONFIG.END_HOUR);
	});

	it('extends min and scrolls to events before business start', () => {
		const result = resolveAgendaTimeGrid([
			{ start: new Date('2026-02-17T06:00:00') },
			{ start: new Date('2026-02-18T11:00:00') },
		]);

		expect(result.min.getHours()).toBe(6);
		expect(result.scrollToTime.getHours()).toBe(6);
		expect(result.scrollToTime.getMinutes()).toBe(0);
		expect(result.max.getHours()).toBe(AVAILABILITY_CONFIG.END_HOUR);
	});

	it('ignores events without a valid start', () => {
		const result = resolveAgendaTimeGrid([
			{ start: null },
			{ start: undefined },
			{ start: new Date('invalid') },
			{ start: new Date('2026-02-17T11:45:00') },
		]);

		expect(result.scrollToTime.getHours()).toBe(11);
		expect(result.scrollToTime.getMinutes()).toBe(45);
	});

	it('falls back to now when the view has no events', () => {
		const now = new Date('2026-02-17T13:20:00');
		const result = resolveAgendaTimeGrid([], now);

		expect(result.scrollToTime.getHours()).toBe(13);
		expect(result.scrollToTime.getMinutes()).toBe(20);
		expect(result.min.getHours()).toBe(AVAILABILITY_CONFIG.START_HOUR);
	});

	it('falls back to business start when now is at or after end hour', () => {
		const now = new Date(2026, 1, 17, AVAILABILITY_CONFIG.END_HOUR, 0, 0);
		const result = resolveAgendaTimeGrid([], now);

		expect(result.scrollToTime.getHours()).toBe(AVAILABILITY_CONFIG.START_HOUR);
		expect(result.scrollToTime.getMinutes()).toBe(0);
	});
});
