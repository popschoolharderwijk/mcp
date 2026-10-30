import { addInterval } from '../../src/lib/lessonIntervalHelpers';
import type { LessonFrequency } from '../courses/types';
import { formatYmd } from '../shared/dateHelpers';

/**
 * Last lesson date for a fixed package: first occurrence + (n - 1) frequency intervals.
 * Returns null when `numberOfLessons` is not a positive integer.
 */
export function deriveEndDateFromLessonCount(
	firstOccurrenceYmd: string,
	frequency: LessonFrequency,
	numberOfLessons: number,
): string | null {
	if (!Number.isInteger(numberOfLessons) || numberOfLessons < 1) return null;
	const date = new Date(`${firstOccurrenceYmd}T12:00:00`);
	if (Number.isNaN(date.getTime())) return null;
	for (let i = 0; i < numberOfLessons - 1; i++) {
		addInterval(date, frequency);
	}
	return formatYmd(date);
}

/** Warning when agreement event refs disagree with contractual lesson count. */
export function eventsLessonCountMismatchWarning(events: unknown, numberOfLessons: number | null): string | null {
	if (numberOfLessons == null || !Number.isInteger(numberOfLessons) || numberOfLessons < 1) {
		return null;
	}
	if (!Array.isArray(events)) return null;
	if (events.length === numberOfLessons) return null;
	return `events count ${events.length} does not match numberoflessons ${numberOfLessons}`;
}
