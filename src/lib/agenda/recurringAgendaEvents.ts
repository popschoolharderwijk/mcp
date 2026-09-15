import type { CalendarEvent } from '@/components/agenda/types';
import { isNonBillingMonthString } from '@/lib/billing/schoolYear';
import { addMinutes, formatDateToDb } from '@/lib/date/date-format';
import {
	addInterval as addIntervalHelper,
	addNIntervals,
	getFirstOccurrenceInRange as getFirstOccurrenceInRangeHelper,
	getOccurrenceIndex,
} from '@/lib/lessonHelpers';
import { applyTimeToDate, hasTimeChange } from '@/lib/time/time-format';
import type { AgendaEventDeviationRow, AgendaEventRow, CancellationType } from '@/types/agenda-events';
import type { LessonAgreementWithStudent, LessonFrequency } from '@/types/lesson-agreements';
import { findNoLessonPeriod, type NoLessonPeriod } from './noLessonPeriod';

type RecurringContext = {
	ev: AgendaEventRow;
	rangeStart: Date;
	rangeEnd: Date;
	eventDeviations: Map<string, AgendaEventDeviationRow> | undefined;
	recurringList: AgendaEventDeviationRow[];
	agreement: LessonAgreementWithStudent | null;
	isLessonEvent: boolean;
	isLessonSource: boolean;
	noLessonPeriods: NoLessonPeriod[] | undefined;
};

type RecurringScheduleParams = {
	frequency: LessonFrequency;
	dayOfWeek: number;
	periodStart: Date;
	periodEnd: Date | null;
	baseStartTime: string;
	durationMinutes: number | null;
	getDurationMs: () => number;
};

type OccurrenceVisibility = {
	shiftDays: number;
	shiftedDate: Date | null;
	isShifted: boolean;
	skipOccurrence: boolean;
};

type OccurrenceEventTimes = { start: Date; end: Date; isCancelled: boolean };

type OccurrenceDisplayMeta = {
	resourceOriginalDate: string | undefined;
	resourceOriginalStartTime: string | undefined;
	displayTitle: string;
	displayColor: string | null;
	hasTimeOrDateChange: boolean;
};

function resolveRecurringFrequency(ev: AgendaEventRow, agreement: LessonAgreementWithStudent | null): LessonFrequency {
	if (agreement) return agreement.frequency;
	if (
		ev.recurring_frequency === 'daily' ||
		ev.recurring_frequency === 'weekly' ||
		ev.recurring_frequency === 'biweekly' ||
		ev.recurring_frequency === 'monthly'
	) {
		return ev.recurring_frequency;
	}
	return 'weekly';
}

function resolveRecurringPeriodEnd(ev: AgendaEventRow, agreement: LessonAgreementWithStudent | null): Date | null {
	if (agreement) {
		return agreement.end_date ? new Date(agreement.end_date) : null;
	}
	return ev.recurring_end_date ? new Date(ev.recurring_end_date) : null;
}

function resolveRecurringScheduleParams(
	ev: AgendaEventRow,
	agreement: LessonAgreementWithStudent | null,
): RecurringScheduleParams {
	const frequency = resolveRecurringFrequency(ev, agreement);
	const dayOfWeek = agreement ? agreement.day_of_week : new Date(`${ev.start_date}T12:00:00`).getDay();
	const periodStart = agreement ? new Date(agreement.start_date) : new Date(ev.start_date);
	const periodEnd = resolveRecurringPeriodEnd(ev, agreement);
	const baseStartTime = agreement ? agreement.start_time : ev.start_time;
	const durationMinutes = agreement ? agreement.duration_minutes : null;
	return {
		frequency,
		dayOfWeek,
		periodStart,
		periodEnd,
		baseStartTime,
		durationMinutes,
		getDurationMs: () => getEventDurationMs(ev, durationMinutes),
	};
}

function shouldStopRecurringLoop(current: Date, periodEnd: Date | null, rangeEnd: Date, shiftDays: number): boolean {
	if (periodEnd && current > periodEnd) return true;
	if (current > rangeEnd && shiftDays === 0) return true;
	return current > rangeEnd;
}

function findEffectiveDeviation(
	dateStr: string,
	eventDeviations: Map<string, AgendaEventDeviationRow> | undefined,
	recurringList: AgendaEventDeviationRow[],
): AgendaEventDeviationRow | undefined {
	const deviation = eventDeviations?.get(dateStr);
	const recurringDeviation = recurringList.find(
		(d) => d.original_date <= dateStr && (!d.spans_end_date || d.spans_end_date >= dateStr),
	);
	return deviation ?? recurringDeviation;
}

function getEventDurationMs(ev: AgendaEventRow, durationMinutes: number | null): number {
	if (durationMinutes != null) return durationMinutes * 60 * 1000;
	if (ev.end_time && ev.start_time) {
		const startDate = new Date(`2000-01-01T${ev.start_time}`);
		const endDate = new Date(`2000-01-01T${ev.end_time}`);
		return endDate.getTime() - startDate.getTime();
	}
	return 60 * 60 * 1000;
}

function resolveShiftedLessonDate(
	current: Date,
	shiftDays: number,
	noLessonPeriods: NoLessonPeriod[] | undefined,
): { shiftedDate: Date; shiftDays: number; isShifted: boolean } {
	const shiftedDate = new Date(current);
	let days = shiftDays;
	let isShifted = false;
	if (days > 0) shiftedDate.setDate(shiftedDate.getDate() + days);
	while (true) {
		const period = findNoLessonPeriod(shiftedDate, noLessonPeriods);
		if (!period) break;
		const len =
			Math.round(
				(Date.parse(`${period.end_date}T12:00:00`) - Date.parse(`${period.start_date}T12:00:00`)) / 86_400_000,
			) + 1;
		days += len;
		shiftedDate.setDate(shiftedDate.getDate() + len);
		isShifted = true;
	}
	return { shiftedDate, shiftDays: days, isShifted };
}

function shouldSkipShiftedLessonOccurrence(shiftedDate: Date, periodEnd: Date | null): boolean {
	if (periodEnd && shiftedDate > periodEnd) return true;
	return isNonBillingMonthString(formatDateToDb(shiftedDate));
}

function evaluateLessonSourceOccurrenceVisibility(
	current: Date,
	shiftDays: number,
	periodEnd: Date | null,
	rangeStart: Date,
	rangeEnd: Date,
	noLessonPeriods: NoLessonPeriod[] | undefined,
): OccurrenceVisibility {
	const shift = resolveShiftedLessonDate(current, shiftDays, noLessonPeriods);
	const nextShiftDays = shift.shiftDays;
	const { shiftedDate, isShifted } = shift;

	if (shouldSkipShiftedLessonOccurrence(shiftedDate, periodEnd)) {
		return { shiftDays: nextShiftDays, shiftedDate, isShifted, skipOccurrence: true };
	}

	const outsideRenderWindow = shiftedDate < rangeStart || shiftedDate > rangeEnd;
	return { shiftDays: nextShiftDays, shiftedDate, isShifted, skipOccurrence: outsideRenderWindow };
}

function evaluateOccurrenceVisibility(
	current: Date,
	shiftDays: number,
	effective: AgendaEventDeviationRow | undefined,
	isLessonSource: boolean,
	periodEnd: Date | null,
	rangeStart: Date,
	rangeEnd: Date,
	noLessonPeriods: NoLessonPeriod[] | undefined,
): OccurrenceVisibility {
	if (isLessonSource && !effective) {
		return evaluateLessonSourceOccurrenceVisibility(
			current,
			shiftDays,
			periodEnd,
			rangeStart,
			rangeEnd,
			noLessonPeriods,
		);
	}

	if (current < rangeStart) {
		return { shiftDays, shiftedDate: null, isShifted: false, skipOccurrence: true };
	}

	return { shiftDays, shiftedDate: null, isShifted: false, skipOccurrence: false };
}

function buildDeviationEventTimes(
	ctx: RecurringContext,
	current: Date,
	effective: AgendaEventDeviationRow,
	durationMinutes: number | null,
	getDurationMs: () => number,
): OccurrenceEventTimes {
	if (effective.is_cancelled) {
		const start = applyTimeToDate(new Date(current), effective.original_start_time);
		const end =
			durationMinutes != null
				? addMinutes(start, durationMinutes)
				: ctx.ev.end_time
					? applyTimeToDate(start, ctx.ev.end_time)
					: addMinutes(start, 60);
		return { start, end, isCancelled: true };
	}

	const [h, m] = effective.actual_start_time.split(':').map(Number);
	let actualDate: Date;
	if (effective.spans_future_occurrences) {
		const frequency = resolveRecurringFrequency(ctx.ev, ctx.agreement);
		const originalDate = new Date(`${effective.original_date}T12:00:00`);
		const occurrenceIndex = getOccurrenceIndex(originalDate, current, frequency);
		actualDate = addNIntervals(new Date(`${effective.actual_date}T12:00:00`), occurrenceIndex, frequency);
	} else {
		actualDate = new Date(`${effective.actual_date}T12:00:00`);
	}
	actualDate.setHours(h, m ?? 0, 0, 0);
	return { start: actualDate, end: addMinutes(actualDate, getDurationMs() / (60 * 1000)), isCancelled: false };
}

function buildDefaultEventTimes(
	ctx: RecurringContext,
	base: Date,
	baseStartTime: string,
	durationMinutes: number | null,
	getDurationMs: () => number,
): { start: Date; end: Date } {
	const start = applyTimeToDate(new Date(base), baseStartTime);
	const end =
		durationMinutes != null
			? addMinutes(start, durationMinutes)
			: ctx.ev.end_time
				? applyTimeToDate(new Date(base), ctx.ev.end_time)
				: addMinutes(start, getDurationMs() / (60 * 1000));
	return { start, end };
}

function buildOccurrenceEventTimes(
	ctx: RecurringContext,
	current: Date,
	effective: AgendaEventDeviationRow | undefined,
	shiftedDate: Date | null,
	baseStartTime: string,
	durationMinutes: number | null,
	getDurationMs: () => number,
): OccurrenceEventTimes {
	if (effective) {
		return buildDeviationEventTimes(ctx, current, effective, durationMinutes, getDurationMs);
	}
	return {
		...buildDefaultEventTimes(ctx, shiftedDate ?? new Date(current), baseStartTime, durationMinutes, getDurationMs),
		isCancelled: false,
	};
}

function resolveOccurrenceOriginalDate(
	effective: AgendaEventDeviationRow | undefined,
	dateStr: string,
	isShifted: boolean,
): string | undefined {
	if (effective?.spans_future_occurrences) return dateStr;
	return effective?.original_date ?? (isShifted ? dateStr : undefined);
}

function resolveOccurrenceOriginalStartTime(
	effective: AgendaEventDeviationRow | undefined,
	baseStartTime: string,
	isShifted: boolean,
): string | undefined {
	if (effective?.spans_future_occurrences) return baseStartTime;
	return effective?.original_start_time ?? (isShifted ? baseStartTime : undefined);
}

function hasEffectiveTimeOrDateChange(effective: AgendaEventDeviationRow | undefined): boolean {
	if (!effective || effective.is_cancelled) return false;
	return (
		effective.actual_date !== effective.original_date ||
		hasTimeChange(effective.actual_start_time, effective.original_start_time)
	);
}

function buildOccurrenceDisplayMeta(
	effective: AgendaEventDeviationRow | undefined,
	ev: AgendaEventRow,
	dateStr: string,
	isShifted: boolean,
	baseStartTime: string,
): OccurrenceDisplayMeta {
	return {
		resourceOriginalDate: resolveOccurrenceOriginalDate(effective, dateStr, isShifted),
		resourceOriginalStartTime: resolveOccurrenceOriginalStartTime(effective, baseStartTime, isShifted),
		displayTitle: effective?.title ?? ev.title,
		displayColor: effective?.color ?? ev.color ?? null,
		hasTimeOrDateChange: hasEffectiveTimeOrDateChange(effective),
	};
}

function isActiveDeviation(effective: AgendaEventDeviationRow | undefined): boolean {
	return !!effective && !effective.is_cancelled;
}

function resolveDeviationCancellationType(
	effective: AgendaEventDeviationRow | undefined,
): CancellationType | undefined {
	if (!effective) return undefined;
	return (effective as AgendaEventDeviationRow & { cancellation_type?: CancellationType }).cancellation_type;
}

function resolveDeviationNeedsReschedule(effective: AgendaEventDeviationRow | undefined): boolean {
	if (!effective) return false;
	return (effective as AgendaEventDeviationRow & { needs_reschedule?: boolean }).needs_reschedule ?? false;
}

function resolveOccurrenceReason(effective: AgendaEventDeviationRow | undefined, isShifted: boolean): string | null {
	return effective?.reason ?? (isShifted ? 'Verschoven door lesvrije periode' : null);
}

function resolveCalendarResourceOriginalSlot(
	params: { resourceOriginalDate: string | undefined; resourceOriginalStartTime: string | undefined },
	effective: AgendaEventDeviationRow | undefined,
): { originalDate: string | undefined; originalStartTime: string | undefined } {
	return {
		originalDate: params.resourceOriginalDate ?? effective?.original_date,
		originalStartTime: params.resourceOriginalStartTime ?? effective?.original_start_time,
	};
}

function buildCalendarEventResource(
	ctx: RecurringContext,
	params: {
		dateStr: string;
		effective: AgendaEventDeviationRow | undefined;
		isShifted: boolean;
		isCancelled: boolean;
		displayTitle: string;
		displayColor: string | null;
		hasTimeOrDateChange: boolean;
		resourceOriginalDate: string | undefined;
		resourceOriginalStartTime: string | undefined;
		baseStartTime: string;
	},
): CalendarEvent['resource'] {
	const { ev, isLessonEvent } = ctx;
	const { effective } = params;
	const originalSlot = resolveCalendarResourceOriginalSlot(params, effective);
	return {
		type: 'agenda',
		agreementId: ev.source_id ?? ev.id,
		eventId: ev.id,
		deviationId: effective?.id,
		studentName: params.displayTitle,
		lessonTypeName: params.displayTitle,
		lessonTypeColor: params.displayColor,
		lessonTypeIcon: null,
		isDeviation: isActiveDeviation(effective),
		hasTimeOrDateChange: params.hasTimeOrDateChange || params.isShifted,
		isCancelled: params.isCancelled,
		isGroupLesson: false,
		originalDate: originalSlot.originalDate,
		originalStartTime: originalSlot.originalStartTime,
		reason: resolveOccurrenceReason(effective, params.isShifted),
		isRecurring: ev.recurring || (effective?.spans_future_occurrences ?? false),
		sourceType: ev.source_type,
		color: params.displayColor,
		isLesson: isLessonEvent,
		cancellationType: resolveDeviationCancellationType(effective),
		needsReschedule: resolveDeviationNeedsReschedule(effective),
	};
}

function pushRecurringOccurrenceEvent(
	ctx: RecurringContext,
	events: CalendarEvent[],
	params: {
		dateStr: string;
		effective: AgendaEventDeviationRow | undefined;
		isShifted: boolean;
		times: OccurrenceEventTimes;
		display: OccurrenceDisplayMeta;
		baseStartTime: string;
	},
): void {
	const { dateStr, effective, isShifted, times, display, baseStartTime } = params;
	events.push({
		title: display.displayTitle,
		start: times.start,
		end: times.end,
		resource: buildCalendarEventResource(ctx, {
			dateStr,
			effective,
			isShifted,
			isCancelled: times.isCancelled,
			displayTitle: display.displayTitle,
			displayColor: display.displayColor,
			hasTimeOrDateChange: display.hasTimeOrDateChange,
			resourceOriginalDate: display.resourceOriginalDate,
			resourceOriginalStartTime: display.resourceOriginalStartTime,
			baseStartTime,
		}),
	});
}

function appendRecurringOccurrence(
	ctx: RecurringContext,
	events: CalendarEvent[],
	current: Date,
	shiftDays: number,
	schedule: RecurringScheduleParams,
	rangeStart: Date,
	rangeEnd: Date,
): number {
	const dateStr = formatDateToDb(current);
	const effective = findEffectiveDeviation(dateStr, ctx.eventDeviations, ctx.recurringList);
	const visibility = evaluateOccurrenceVisibility(
		current,
		shiftDays,
		effective,
		ctx.isLessonSource,
		schedule.periodEnd,
		rangeStart,
		rangeEnd,
		ctx.noLessonPeriods,
	);

	if (visibility.skipOccurrence) {
		return visibility.shiftDays;
	}

	const times = buildOccurrenceEventTimes(
		ctx,
		current,
		effective,
		visibility.shiftedDate,
		schedule.baseStartTime,
		schedule.durationMinutes,
		schedule.getDurationMs,
	);
	const display = buildOccurrenceDisplayMeta(
		effective,
		ctx.ev,
		dateStr,
		visibility.isShifted,
		schedule.baseStartTime,
	);

	pushRecurringOccurrenceEvent(ctx, events, {
		dateStr,
		effective,
		isShifted: visibility.isShifted,
		times,
		display,
		baseStartTime: schedule.baseStartTime,
	});

	return visibility.shiftDays;
}

export function appendRecurringAgendaEvents(
	ev: AgendaEventRow,
	events: CalendarEvent[],
	rangeStart: Date,
	rangeEnd: Date,
	eventDeviations: Map<string, AgendaEventDeviationRow> | undefined,
	recurringList: AgendaEventDeviationRow[],
	agreement: LessonAgreementWithStudent | null,
	isLessonEvent: boolean,
	isLessonSource: boolean,
	noLessonPeriods: NoLessonPeriod[] | undefined,
): void {
	const ctx: RecurringContext = {
		ev,
		rangeStart,
		rangeEnd,
		eventDeviations,
		recurringList,
		agreement,
		isLessonEvent,
		isLessonSource,
		noLessonPeriods,
	};
	const schedule = resolveRecurringScheduleParams(ev, agreement);
	const current = getFirstOccurrenceInRangeHelper(
		schedule.dayOfWeek,
		schedule.periodStart,
		schedule.periodStart,
		schedule.frequency,
	);
	let shiftDays = 0;

	while (true) {
		if (shouldStopRecurringLoop(current, schedule.periodEnd, rangeEnd, shiftDays)) break;

		shiftDays = appendRecurringOccurrence(ctx, events, current, shiftDays, schedule, rangeStart, rangeEnd);
		addIntervalHelper(current, schedule.frequency);
	}
}
