import type { LessonFrequency } from '../courses/types';
import { formatYmd } from '../shared/dateHelpers';
import { addInterval } from '../shared/lessonIntervalHelpers';
import { computeGroupAgendaStartDate } from './groupLessonImportHelpers';

export type SchedulePhaseShift = {
	originalDate: string;
	actualDate: string;
	offsetDays: number;
	foldedEventCount: number;
	frequency: LessonFrequency;
};

const MAX_OFFSET_DAYS = 28;
const MIN_SUFFIX_EVENTS = 2;

function intervalDays(frequency: LessonFrequency): number | null {
	if (frequency === 'weekly') return 7;
	if (frequency === 'biweekly') return 14;
	return null;
}

function parseYmd(ymd: string): Date {
	return new Date(`${ymd}T12:00:00`);
}

function daysBetween(earlierYmd: string, laterYmd: string): number {
	return Math.round((parseYmd(laterYmd).getTime() - parseYmd(earlierYmd).getTime()) / 86_400_000);
}

/** Expected occurrence dates from agreement recurrence through `untilYmd` inclusive. */
export function buildExpectedOccurrenceDates(
	startDate: string,
	dayOfWeek: number,
	frequency: LessonFrequency,
	untilYmd: string,
	endDate: string | null,
): string[] {
	const first = computeGroupAgendaStartDate(startDate, dayOfWeek);
	const hardEnd = endDate != null && endDate < untilYmd ? endDate : untilYmd;
	if (first > hardEnd) return [];

	const dates: string[] = [];
	const cursor = parseYmd(first);
	while (formatYmd(cursor) <= hardEnd) {
		dates.push(formatYmd(cursor));
		addInterval(cursor, frequency);
	}
	return dates;
}

/** Longest prefix of `suffix` that stays on `interval`-day steps from the first date. */
function longestIntervalAlignedPrefix(suffix: string[], interval: number): string[] {
	const anchor = suffix[0];
	if (anchor == null) return [];
	const aligned: string[] = [anchor];
	for (let i = 1; i < suffix.length; i++) {
		const ymd = suffix[i];
		if (ymd == null) break;
		const delta = daysBetween(anchor, ymd);
		if (delta < 0 || delta % interval !== 0) break;
		aligned.push(ymd);
	}
	return aligned;
}

/**
 * Detect a permanent schedule phase shift: actual lesson dates leave the expected
 * recurrence grid and continue on a parallel weekday grid (offset multiple of 7).
 */
export function detectSchedulePhaseShift(params: {
	startDate: string;
	dayOfWeek: number;
	frequency: LessonFrequency;
	endDate: string | null;
	actualDates: readonly string[];
}): SchedulePhaseShift | null {
	const step = intervalDays(params.frequency);
	if (step == null) return null;

	const actual = [...new Set(params.actualDates)].filter((ymd) => ymd.length === 10).sort();
	if (actual.length < MIN_SUFFIX_EVENTS) return null;

	const untilYmd = actual[actual.length - 1] ?? params.startDate;
	const expected = buildExpectedOccurrenceDates(
		params.startDate,
		params.dayOfWeek,
		params.frequency,
		untilYmd,
		params.endDate,
	);
	const expectedSet = new Set(expected);

	let shiftActual: string | null = null;
	for (const ymd of actual) {
		if (!expectedSet.has(ymd)) {
			shiftActual = ymd;
			break;
		}
	}
	if (shiftActual == null) return null;

	const suffix = actual.filter((ymd) => ymd >= shiftActual);
	const aligned = longestIntervalAlignedPrefix(suffix, step);
	if (aligned.length < MIN_SUFFIX_EVENTS) {
		return null;
	}

	for (let offsetDays = 7; offsetDays <= MAX_OFFSET_DAYS; offsetDays += 7) {
		const original = parseYmd(shiftActual);
		original.setDate(original.getDate() - offsetDays);
		const originalDate = formatYmd(original);
		if (!expectedSet.has(originalDate)) continue;
		if (daysBetween(originalDate, shiftActual) !== offsetDays) continue;

		return {
			originalDate,
			actualDate: shiftActual,
			offsetDays,
			foldedEventCount: aligned.length,
			frequency: params.frequency,
		};
	}

	return null;
}

export function formatSchedulePhaseShiftInfoReason(params: {
	shift: SchedulePhaseShift;
	teacherName: string;
	studentName: string;
}): string {
	const { shift, teacherName, studentName } = params;
	return `${shift.foldedEventCount} events fold into 1 deviation (${teacherName} / ${studentName}): ${shift.frequency} ${shift.originalDate} → ${shift.actualDate} (+${shift.offsetDays}d, this and future)`;
}
