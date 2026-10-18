import { AVAILABILITY_CONFIG } from '@/lib/availability';

/** Time-of-day Date for react-big-calendar scrollToTime (same shape as min/max). */
function timeOfDay(hours: number, minutes = 0): Date {
	return new Date(0, 0, 0, hours, minutes, 0);
}

function minutesSinceMidnight(date: Date): number {
	return date.getHours() * 60 + date.getMinutes();
}

function fallbackScrollToTime(now: Date): Date {
	return now.getHours() >= AVAILABILITY_CONFIG.END_HOUR ? timeOfDay(AVAILABILITY_CONFIG.START_HOUR) : now;
}

/**
 * Scroll target for the time grid: earliest clock time among events in the current view
 * (week/day share one vertical axis), or now / business-start when the view is empty.
 */
export function resolveAgendaScrollToTime(
	events: ReadonlyArray<{ start?: Date | null }>,
	now: Date = new Date(),
): Date {
	let earliestMinutes: number | undefined;
	for (const event of events) {
		const start = event.start;
		if (!(start instanceof Date) || Number.isNaN(start.getTime())) continue;
		const minutes = minutesSinceMidnight(start);
		if (earliestMinutes === undefined || minutes < earliestMinutes) earliestMinutes = minutes;
	}
	if (earliestMinutes === undefined) return fallbackScrollToTime(now);
	return timeOfDay(Math.floor(earliestMinutes / 60), earliestMinutes % 60);
}
