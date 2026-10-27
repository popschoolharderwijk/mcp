import { toAmsterdamScheduleSlot } from './dateHelpers';

function parseScheduleInstant(value: unknown): Date | null {
	if (typeof value !== 'string' || value.trim() === '') return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

/** Latest usable schedule startdatetime → day_of_week + start_time in Europe/Amsterdam. */
export function pickLatestScheduleSlot(schedule: unknown): { dayOfWeek: number; startTime: string } | null {
	if (!Array.isArray(schedule)) return null;

	let latest: Date | null = null;
	for (const item of schedule) {
		if (item === null || typeof item !== 'object' || Array.isArray(item)) continue;
		const instant = parseScheduleInstant((item as Record<string, unknown>).startdatetime);
		if (!instant) continue;
		if (!latest || instant.getTime() > latest.getTime()) {
			latest = instant;
		}
	}
	if (!latest) return null;

	return toAmsterdamScheduleSlot(latest);
}
