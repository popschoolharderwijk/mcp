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
/** How far ahead of `asOfYmd` to check that a historical shift still matches Mongo. */
const DEFAULT_FORWARD_WINDOW_DAYS = 120;

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

function addDaysYmd(ymd: string, days: number): string {
	const date = parseYmd(ymd);
	date.setDate(date.getDate() + days);
	return formatYmd(date);
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

function isOnShiftedPhase(ymd: string, shiftActualDate: string, step: number): boolean {
	const delta = daysBetween(shiftActualDate, ymd);
	return delta >= 0 && delta % step === 0;
}

/**
 * Forward window used to reject stale historical phase flips (holiday-driven
 * oscillations) that no longer match upcoming Mongo lesson dates.
 */
function resolveForwardWindowDates(actual: readonly string[], asOfYmd: string, forwardWindowDays: number): string[] {
	const windowEnd = addDaysYmd(asOfYmd, forwardWindowDays);
	const inWindow = actual.filter((ymd) => ymd >= asOfYmd && ymd <= windowEnd);
	if (inWindow.length >= MIN_SUFFIX_EVENTS) return inWindow;
	if (actual.length < MIN_SUFFIX_EVENTS) return [...actual];
	return actual.slice(-Math.max(MIN_SUFFIX_EVENTS, Math.min(8, actual.length)));
}

function shiftMatchesForwardWindow(
	shift: SchedulePhaseShift,
	windowDates: readonly string[],
	expectedSet: ReadonlySet<string>,
	step: number,
): boolean {
	if (windowDates.length < MIN_SUFFIX_EVENTS) return false;

	let onShift = 0;
	let onExpected = 0;
	for (const ymd of windowDates) {
		if (isOnShiftedPhase(ymd, shift.actualDate, step)) onShift += 1;
		if (expectedSet.has(ymd)) onExpected += 1;
	}
	return onShift >= MIN_SUFFIX_EVENTS && onShift >= onExpected;
}

function detectFirstPhaseShift(params: {
	frequency: LessonFrequency;
	step: number;
	expectedSet: ReadonlySet<string>;
	actual: readonly string[];
}): SchedulePhaseShift | null {
	let shiftActual: string | null = null;
	for (const ymd of params.actual) {
		if (!params.expectedSet.has(ymd)) {
			shiftActual = ymd;
			break;
		}
	}
	if (shiftActual == null) return null;

	const suffix = params.actual.filter((ymd) => ymd >= shiftActual);
	const aligned = longestIntervalAlignedPrefix(suffix, params.step);
	if (aligned.length < MIN_SUFFIX_EVENTS) {
		return null;
	}

	for (let offsetDays = 7; offsetDays <= MAX_OFFSET_DAYS; offsetDays += 7) {
		const original = parseYmd(shiftActual);
		original.setDate(original.getDate() - offsetDays);
		const originalDate = formatYmd(original);
		if (!params.expectedSet.has(originalDate)) continue;
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

/**
 * Detect a schedule phase shift: actual lesson dates leave the expected recurrence
 * grid and continue on a parallel weekday grid (offset multiple of 7).
 *
 * When `asOfYmd` is set, a candidate shift is kept only if upcoming Mongo dates in
 * the forward window still follow that shifted phase — stale historical flips
 * (common around holidays) are dropped so the recurrence matches current lessons.
 */
export function detectSchedulePhaseShift(params: {
	startDate: string;
	dayOfWeek: number;
	frequency: LessonFrequency;
	endDate: string | null;
	actualDates: readonly string[];
	/** Inclusive start of the forward validation window (typically import "today"). */
	asOfYmd?: string | null;
	forwardWindowDays?: number;
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

	const candidate = detectFirstPhaseShift({
		frequency: params.frequency,
		step,
		expectedSet,
		actual,
	});

	const asOfYmd = params.asOfYmd ?? null;
	if (asOfYmd == null) {
		return candidate;
	}

	const windowDates = resolveForwardWindowDates(
		actual,
		asOfYmd,
		params.forwardWindowDays ?? DEFAULT_FORWARD_WINDOW_DAYS,
	);

	if (candidate != null && shiftMatchesForwardWindow(candidate, windowDates, expectedSet, step)) {
		return candidate;
	}

	return detectFirstPhaseShift({
		frequency: params.frequency,
		step,
		expectedSet,
		actual: windowDates,
	});
}

export function formatSchedulePhaseShiftInfoReason(params: {
	shift: SchedulePhaseShift;
	teacherName: string;
	studentName: string;
}): string {
	const { shift, teacherName, studentName } = params;
	return `${shift.foldedEventCount} events fold into 1 deviation (${teacherName} / ${studentName}): ${shift.frequency} ${shift.originalDate} → ${shift.actualDate} (+${shift.offsetDays}d, this and future)`;
}
