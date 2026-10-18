import { AVAILABILITY_CONFIG } from '@/lib/availability';

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

function fallbackScrollMinutes(now: Date, minMinutes: number, maxMinutes: number): number {
	if (now.getHours() >= AVAILABILITY_CONFIG.END_HOUR) return minMinutes;
	return clampMinutes(minutesSinceMidnight(now), minMinutes, maxMinutes);
}

export interface AgendaTimeGrid {
	min: Date;
	max: Date;
	scrollToTime: Date;
}

/**
 * Time-grid window + scroll target for react-big-calendar.
 * Extends min when events start before START_HOUR: RBC scroll math uses an absolute
 * diff against min, so scrollToTime 08:00 with min 09:00 scrolls like 10:00.
 */
export function resolveAgendaTimeGrid(
	events: ReadonlyArray<{ start?: Date | null }>,
	now: Date = new Date(),
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
			? AVAILABILITY_CONFIG.START_HOUR
			: Math.min(AVAILABILITY_CONFIG.START_HOUR, Math.floor(earliestMinutes / 60));
	const minMinutes = minHour * 60;
	const maxMinutes = AVAILABILITY_CONFIG.END_HOUR * 60;

	const scrollMinutes =
		earliestMinutes === undefined
			? fallbackScrollMinutes(now, minMinutes, maxMinutes)
			: clampMinutes(earliestMinutes, minMinutes, maxMinutes);

	return {
		min: timeOfDay(minHour),
		max: timeOfDay(AVAILABILITY_CONFIG.END_HOUR),
		scrollToTime: timeOfDay(Math.floor(scrollMinutes / 60), scrollMinutes % 60),
	};
}
