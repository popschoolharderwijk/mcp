import { formatDateToDb, now } from '@/lib/date/date-format';
import { formatTime, formatTimeFromDate, normalizeTime } from '@/lib/time/time-format';
import type { AgendaEventRow } from '@/types/agenda-events';

/** Overrides from a deviation for a single occurrence (title/description/color). Null means use base event. */
export interface OccurrenceOverrides {
	title: string | null;
	description: string | null;
	color: string | null;
}

import type { LessonFrequency } from '@/types/lesson-agreements';

export interface AgendaFormSnapshot {
	title: string;
	description: string;
	startDate: string;
	startTime: string;
	endDate: string;
	endTime: string;
	isAllDay: boolean;
	recurring: boolean;
	recurringFrequency: string;
	recurringEndDate: string | null;
	color: string | null;
	participantIds: string[];
}

export interface AgendaFormCurrentValues {
	title: string;
	description: string;
	startDate: string | null;
	startTime: string;
	endDate: string | null;
	endTime: string;
	isAllDay: boolean;
	recurring: boolean;
	recurringFrequency: LessonFrequency;
	recurringEndDate: string | null;
	color: string | null;
	participantIds: string[];
}

function resolveOccurrenceTitle(event: AgendaEventRow, overrides: OccurrenceOverrides | null | undefined): string {
	if (!overrides) return event.title;
	return overrides.title ?? event.title;
}

function resolveOccurrenceDescription(
	event: AgendaEventRow,
	overrides: OccurrenceOverrides | null | undefined,
): string {
	if (!overrides) return event.description ?? '';
	return overrides.description ?? event.description ?? '';
}

function resolveOccurrenceColor(
	event: AgendaEventRow,
	overrides: OccurrenceOverrides | null | undefined,
): string | null {
	if (!overrides) return event.color ?? null;
	return overrides.color ?? event.color ?? null;
}

export function buildInitialFormSnapshot(
	event: AgendaEventRow,
	occurrenceDate: string | null | undefined,
	occurrenceStartTime: string | null | undefined,
	occurrenceEndTime: string | null | undefined,
	occurrenceOverrides: OccurrenceOverrides | null | undefined,
	initialParticipantIds: string[],
): AgendaFormSnapshot {
	const origStart = (occurrenceStartTime ?? event.start_time).toString();
	const origEnd = (occurrenceEndTime ?? event.end_time ?? event.start_time)?.toString() ?? '10:00';

	return {
		title: resolveOccurrenceTitle(event, occurrenceOverrides),
		description: resolveOccurrenceDescription(event, occurrenceOverrides),
		startDate: occurrenceDate ?? event.start_date,
		startTime: normalizeTime(formatTime(origStart)),
		endDate: occurrenceDate ?? event.end_date ?? event.start_date,
		endTime: normalizeTime(formatTime(origEnd)),
		isAllDay: event.is_all_day,
		recurring: event.recurring,
		recurringFrequency: (event.recurring_frequency as string) ?? 'weekly',
		recurringEndDate: event.recurring_end_date ?? null,
		color: resolveOccurrenceColor(event, occurrenceOverrides),
		participantIds: initialParticipantIds.toSorted(),
	};
}

export function hasAgendaFormChanges(snapshot: AgendaFormSnapshot | null, current: AgendaFormCurrentValues): boolean {
	if (!snapshot) return true;

	const sortedParticipantIds = current.participantIds.toSorted();

	return (
		snapshot.title !== current.title.trim() ||
		snapshot.description !== (current.description ?? '') ||
		snapshot.startDate !== (current.startDate ?? '') ||
		snapshot.startTime !== normalizeTime(current.startTime) ||
		snapshot.endDate !== (current.endDate ?? current.startDate ?? '') ||
		snapshot.endTime !== normalizeTime(current.endTime) ||
		snapshot.isAllDay !== current.isAllDay ||
		snapshot.recurring !== current.recurring ||
		snapshot.recurringFrequency !== (current.recurringFrequency as string) ||
		snapshot.recurringEndDate !== (current.recurring ? current.recurringEndDate : null) ||
		snapshot.color !== (current.color ?? null) ||
		snapshot.participantIds.length !== sortedParticipantIds.length ||
		!snapshot.participantIds.every((id, index) => id === sortedParticipantIds[index])
	);
}

export interface EditFormSeedValues {
	title: string;
	description: string;
	startDate: string;
	startTime: string;
	endDate: string;
	endTime: string;
	isAllDay: boolean;
	recurring: boolean;
	recurringFrequency: LessonFrequency;
	recurringEndDate: string | null;
	color: string | null;
	showDescription: boolean;
}

export function buildEditFormSeedValues(
	event: AgendaEventRow,
	occurrenceDate: string | null | undefined,
	occurrenceStartTime: string | null | undefined,
	occurrenceEndTime: string | null | undefined,
	occurrenceOverrides: OccurrenceOverrides | null | undefined,
): EditFormSeedValues {
	const description = resolveOccurrenceDescription(event, occurrenceOverrides);

	return {
		title: resolveOccurrenceTitle(event, occurrenceOverrides),
		description,
		startDate: occurrenceDate ?? event.start_date,
		startTime: (occurrenceStartTime ?? event.start_time).substring(0, 5),
		endDate: occurrenceDate ?? event.end_date ?? event.start_date,
		endTime: (occurrenceEndTime ?? event.end_time)?.substring(0, 5) ?? '10:00',
		isAllDay: event.is_all_day,
		recurring: event.recurring,
		recurringFrequency: (event.recurring_frequency as LessonFrequency) ?? 'weekly',
		recurringEndDate: event.recurring_end_date,
		color: resolveOccurrenceColor(event, occurrenceOverrides),
		showDescription: Boolean(description),
	};
}

export interface CreateFormSeedValues {
	startDate: string;
	startTime: string;
	endDate: string;
	endTime: string;
	participantIds: string[];
}

export function buildCreateFormSeedValues(
	initialSlot: { start: Date; end: Date } | null | undefined,
	userId: string | undefined,
): CreateFormSeedValues {
	const today = formatDateToDb(now());

	if (initialSlot) {
		return {
			startDate: formatDateToDb(initialSlot.start),
			startTime: formatTimeFromDate(initialSlot.start),
			endDate: formatDateToDb(initialSlot.end),
			endTime: formatTimeFromDate(initialSlot.end),
			participantIds: userId ? [userId] : [],
		};
	}

	return {
		startDate: today,
		startTime: '09:00',
		endDate: today,
		endTime: '10:00',
		participantIds: userId ? [userId] : [],
	};
}
