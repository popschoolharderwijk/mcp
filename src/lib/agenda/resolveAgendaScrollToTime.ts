import { APP_SETTINGS_BOOTSTRAP } from '@/lib/settings/appSettingsDefaults';
import type { AgendaSetting } from '@/lib/settings/appSettingsTypes';

/** Time-of-day Date for react-big-calendar min/max/scrollToTime. */
function timeOfDay(hours: number, minutes = 0): Date {
	return new Date(0, 0, 0, hours, minutes, 0);
}

function minutesSinceMidnight(date: Date): number {
	return date.getHours() * 60 + date.getMinutes();
}

function clampMinutes(minutes: number, minMinutes: number, maxMinutes: number): number {
	return Math.max(minMinutes, Math.min(maxMinutes, minutes));
}

function fallbackScrollMinutes(now: Date, minMinutes: number, maxMinutes: number, endHour: number): number {
	if (now.getHours() >= endHour) return minMinutes;
	return clampMinutes(minutesSinceMidnight(now), minMinutes, maxMinutes);
}

export interface AgendaTimeGrid {
	min: Date;
	max: Date;
	scrollToTime: Date;
}

export type AgendaHourBounds = Pick<AgendaSetting, 'start_hour' | 'end_hour'>;

/**
 * Time-grid window + scroll target for react-big-calendar.
 * Extends min when events start before start_hour: RBC scroll math uses an absolute
 * diff against min, so scrollToTime 08:00 with min 09:00 scrolls like 10:00.
 */
export function resolveAgendaTimeGrid(
	events: ReadonlyArray<{ start?: Date | null }>,
	now: Date = new Date(),
	bounds: AgendaHourBounds = APP_SETTINGS_BOOTSTRAP.agenda,
): AgendaTimeGrid {
	let earliestMinutes: number | undefined;
	for (const event of events) {
		const start = event.start;
		if (!(start instanceof Date) || Number.isNaN(start.getTime())) continue;
		const minutes = minutesSinceMidnight(start);
		if (earliestMinutes === undefined || minutes < earliestMinutes) earliestMinutes = minutes;
	}

	const minHour =
		earliestMinutes === undefined
			? bounds.start_hour
			: Math.min(bounds.start_hour, Math.floor(earliestMinutes / 60));
	const minMinutes = minHour * 60;
	const maxMinutes = bounds.end_hour * 60;

	const scrollMinutes =
		earliestMinutes === undefined
			? fallbackScrollMinutes(now, minMinutes, maxMinutes, bounds.end_hour)
			: clampMinutes(earliestMinutes, minMinutes, maxMinutes);

	return {
		min: timeOfDay(minHour),
		max: timeOfDay(bounds.end_hour),
		scrollToTime: timeOfDay(Math.floor(scrollMinutes / 60), scrollMinutes % 60),
	};
}
