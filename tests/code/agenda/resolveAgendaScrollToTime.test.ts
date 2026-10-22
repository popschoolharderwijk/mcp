import { describe, expect, it } from 'bun:test';
import { resolveAgendaTimeGrid } from '../../../src/lib/agenda/resolveAgendaScrollToTime';
import { APP_SETTINGS } from '../../rls/seed-data-constants';

const BOUNDS = APP_SETTINGS.AGENDA;

describe('resolveAgendaTimeGrid', () => {
	it('uses the earliest clock time among events in the view', () => {
		const result = resolveAgendaTimeGrid(
			[
				{ start: new Date('2026-02-17T16:30:00') },
				{ start: new Date('2026-02-18T10:15:00') },
				{ start: new Date('2026-02-19T14:00:00') },
			],
			new Date(),
			BOUNDS,
		);

		expect(result.scrollToTime.getHours()).toBe(10);
		expect(result.scrollToTime.getMinutes()).toBe(15);
		expect(result.min.getHours()).toBe(BOUNDS.start_hour);
		expect(result.max.getHours()).toBe(BOUNDS.end_hour);
	});

	it('extends min and scrolls to events before business start', () => {
		const result = resolveAgendaTimeGrid(
			[{ start: new Date('2026-02-17T06:00:00') }, { start: new Date('2026-02-18T11:00:00') }],
			new Date(),
			BOUNDS,
		);

		expect(result.min.getHours()).toBe(6);
		expect(result.scrollToTime.getHours()).toBe(6);
		expect(result.scrollToTime.getMinutes()).toBe(0);
		expect(result.max.getHours()).toBe(BOUNDS.end_hour);
	});

	it('ignores events without a valid start', () => {
		const result = resolveAgendaTimeGrid(
			[
				{ start: null },
				{ start: undefined },
				{ start: new Date('invalid') },
				{ start: new Date('2026-02-17T11:45:00') },
			],
			new Date(),
			BOUNDS,
		);

		expect(result.scrollToTime.getHours()).toBe(11);
		expect(result.scrollToTime.getMinutes()).toBe(45);
	});

	it('falls back to now when the view has no events', () => {
		const now = new Date('2026-02-17T13:20:00');
		const result = resolveAgendaTimeGrid([], now, BOUNDS);

		expect(result.scrollToTime.getHours()).toBe(13);
		expect(result.scrollToTime.getMinutes()).toBe(20);
		expect(result.min.getHours()).toBe(BOUNDS.start_hour);
	});

	it('falls back to business start when now is at or after end hour', () => {
		const now = new Date(2026, 1, 17, BOUNDS.end_hour, 0, 0);
		const result = resolveAgendaTimeGrid([], now, BOUNDS);

		expect(result.scrollToTime.getHours()).toBe(BOUNDS.start_hour);
		expect(result.scrollToTime.getMinutes()).toBe(0);
	});

	it('uses configured start and end hours from settings', () => {
		const result = resolveAgendaTimeGrid([], new Date('2026-02-17T12:00:00'), {
			start_hour: 7,
			end_hour: 20,
		});

		expect(result.min.getHours()).toBe(7);
		expect(result.max.getHours()).toBe(20);
	});
});
