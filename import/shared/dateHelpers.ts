const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const AMSTERDAM_TZ = 'Europe/Amsterdam';

const AMSTERDAM_PARTS = new Intl.DateTimeFormat('en-US', {
	timeZone: AMSTERDAM_TZ,
	weekday: 'short',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
	hourCycle: 'h23',
});

const WEEKDAY_TO_DOW: Record<string, number> = {
	Sun: 0,
	Mon: 1,
	Tue: 2,
	Wed: 3,
	Thu: 4,
	Fri: 5,
	Sat: 6,
};

/** Format a local `Date` as `YYYY-MM-DD`. */
export function formatYmd(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Instant → Europe/Amsterdam wall clock for lesson_agreements.day_of_week (0=Sun) + start_time.
 * Applies CET/CEST so Mongo UTC startdatetime maps to the Dutch schedule time.
 */
export function toAmsterdamScheduleSlot(instant: Date): { dayOfWeek: number; startTime: string } {
	const parts = AMSTERDAM_PARTS.formatToParts(instant);
	const value = (type: Intl.DateTimeFormatPartTypes): string => parts.find((part) => part.type === type)?.value ?? '';

	const dayOfWeek = WEEKDAY_TO_DOW[value('weekday')];
	if (dayOfWeek === undefined) {
		throw new Error(`Unexpected Amsterdam weekday for ${instant.toISOString()}`);
	}

	const hours = value('hour').padStart(2, '0');
	const minutes = value('minute').padStart(2, '0');
	const seconds = value('second').padStart(2, '0');
	return { dayOfWeek, startTime: `${hours}:${minutes}:${seconds}` };
}

/** Parse a date string to `YYYY-MM-DD`, or null if invalid / empty. */
export function normalizeIsoDate(input: string | null | undefined): string | null {
	if (input == null) return null;
	const trimmed = input.trim();
	if (!trimmed) return null;

	const match = ISO_DATE_RE.exec(trimmed);
	if (!match) return null;

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day));
	if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
		return null;
	}

	return `${match[1]}-${match[2]}-${match[3]}`;
}
