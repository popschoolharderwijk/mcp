import type { CalendarEvent } from '../../../src/components/agenda/types';
import { buildParticipantInfo } from '../../../src/lib/agenda/eventUtils';
import { pushToMapArray } from '../../../src/lib/collections';
import { addMinutes, formatDateToDb, getDateForDayOfWeek } from '../../../src/lib/date/date-format';
import { getDisplayName } from '../../../src/lib/display-name';
import {
	addInterval as addIntervalHelper,
	getFirstOccurrenceInRange as getFirstOccurrenceInRangeHelper,
} from '../../../src/lib/lessonHelpers';
import { applyTimeToDate, hasTimeChange } from '../../../src/lib/time/time-format';
import type { AgendaEventDeviationRow, CancellationType } from '../../../src/types/agenda-events';
import type { LessonAgreementWithStudent, LessonFrequency } from '../../../src/types/lesson-agreements';
import type { User, UserOptional } from '../../../src/types/users';
import type { LessonAppointmentDeviationWithAgreement } from './types';

function getFrequency(agreement: LessonAgreementWithStudent): LessonFrequency {
	return agreement.frequency;
}

function getFirstOccurrenceInRange(
	agreement: LessonAgreementWithStudent,
	rangeStart: Date,
	frequency: LessonFrequency,
): Date {
	const periodStart = new Date(agreement.start_date);
	return getFirstOccurrenceInRangeHelper(agreement.day_of_week, rangeStart, periodStart, frequency);
}

function addInterval(date: Date, frequency: LessonFrequency): void {
	addIntervalHelper(date, frequency);
}

function getGroupingKey(agreement: LessonAgreementWithStudent, frequency: LessonFrequency): string {
	const base = `${agreement.start_time}-${agreement.lesson_type_id}-${frequency}`;
	if (frequency === 'weekly') return `${agreement.day_of_week}-${base}`;
	if (frequency === 'daily') return base;
	return `${agreement.start_date}-${base}`;
}

function getRecurringDeviationForDate(
	recurringByEventId: Map<string, LessonAppointmentDeviationWithAgreement[]>,
	eventId: string,
	occurrenceDateStr: string,
): LessonAppointmentDeviationWithAgreement | undefined {
	const list = recurringByEventId.get(eventId);
	if (!list?.length) return undefined;
	return list.find(
		(d) => d.original_date <= occurrenceDateStr && (!d.spans_end_date || d.spans_end_date >= occurrenceDateStr),
	);
}

function groupAgreementsBySchedule(
	agreements: LessonAgreementWithStudent[],
): Map<string, LessonAgreementWithStudent[]> {
	const groupedAgreements = new Map<string, LessonAgreementWithStudent[]>();
	for (const agreement of agreements) {
		pushToMapArray(groupedAgreements, getGroupingKey(agreement, getFrequency(agreement)), agreement);
	}
	return groupedAgreements;
}

function resolveGroupedAgreementDateWindow(group: LessonAgreementWithStudent[]): {
	earliestStartDate: Date;
	latestEndDate: Date | null;
} {
	const earliestStartDate = new Date(Math.min(...group.map((a) => new Date(a.start_date).getTime())));
	if (group.some((a) => !a.end_date)) return { earliestStartDate, latestEndDate: null };
	return {
		earliestStartDate,
		latestEndDate: new Date(Math.max(...group.map((a) => new Date(a.end_date as string).getTime()))),
	};
}

function isDateInsideAgreementWindow(
	currentLessonDate: Date,
	earliestStartDate: Date,
	latestEndDate: Date | null,
): boolean {
	return currentLessonDate >= earliestStartDate && (!latestEndDate || currentLessonDate <= latestEndDate);
}

function resolveDeviationLessonType(
	lesson: LessonAgreementWithStudent,
	fallbackTitle: string | null | undefined,
	firstAgreement: LessonAgreementWithStudent,
): { name: string; color: string | null; icon: string | null } {
	if ('lesson_types' in lesson) {
		return {
			name: lesson.lesson_types.name,
			color: lesson.lesson_types.color,
			icon: lesson.lesson_types.icon,
		};
	}
	return {
		name: fallbackTitle ?? firstAgreement.lesson_types.name,
		color: null,
		icon: null,
	};
}

function resolveDeviationStudent(
	lesson: LessonAgreementWithStudent,
	firstAgreement: LessonAgreementWithStudent,
): { studentName: string; userInfo: ReturnType<typeof buildParticipantInfo> } {
	const profile = lesson.profiles as UserOptional | null;
	return {
		studentName: getDisplayName(profile),
		userInfo: buildParticipantInfo(
			profile,
			'student_user_id' in lesson ? lesson.student_user_id : firstAgreement.student_user_id,
		),
	};
}

function hasActiveTimeOrDateChange(deviation: LessonAppointmentDeviationWithAgreement): boolean {
	return (
		!deviation.is_cancelled &&
		(deviation.actual_date !== deviation.original_date ||
			hasTimeChange(deviation.actual_start_time, deviation.original_start_time))
	);
}

function deviationCancellationMeta(deviation: LessonAppointmentDeviationWithAgreement): {
	cancellationType: CancellationType | undefined;
	needsReschedule: boolean;
} {
	const typed = deviation as AgendaEventDeviationRow & {
		cancellation_type?: CancellationType;
		needs_reschedule?: boolean;
	};
	return {
		cancellationType: typed.cancellation_type ?? undefined,
		needsReschedule: typed.needs_reschedule ?? false,
	};
}

function pushSingleDateDeviationEvent(
	events: CalendarEvent[],
	deviation: LessonAppointmentDeviationWithAgreement,
	firstAgreement: LessonAgreementWithStudent,
	eventId: string,
	durationMinutes: number,
): void {
	const isCancelled = deviation.is_cancelled;
	const timeStr = isCancelled ? deviation.original_start_time : deviation.actual_start_time;
	const baseDate = isCancelled ? deviation.original_date : deviation.actual_date;
	const eventDate = applyTimeToDate(new Date(baseDate), timeStr);
	const isEffectivelyOriginal =
		!isCancelled &&
		new Date(deviation.actual_date).getDay() === firstAgreement.day_of_week &&
		deviation.actual_start_time.substring(0, 5) === firstAgreement.start_time.substring(0, 5);
	const lesson = deviation.lesson_agreement ?? firstAgreement;
	const student = resolveDeviationStudent(lesson, firstAgreement);
	const lessonType = resolveDeviationLessonType(lesson, deviation.agenda_event?.title, firstAgreement);
	const meta = deviationCancellationMeta(deviation);
	events.push({
		title: `${lessonType.name} - ${student.studentName}`,
		start: eventDate,
		end: addMinutes(eventDate, durationMinutes),
		resource: {
			type: isEffectivelyOriginal ? 'agreement' : 'deviation',
			agreementId: firstAgreement.id,
			eventId,
			deviationId: deviation.id,
			studentName: student.studentName,
			user: student.userInfo,
			lessonTypeName: lessonType.name,
			lessonTypeColor: lessonType.color,
			lessonTypeIcon: lessonType.icon,
			isDeviation: !isCancelled && !isEffectivelyOriginal,
			hasTimeOrDateChange: hasActiveTimeOrDateChange(deviation),
			isCancelled,
			isGroupLesson: false,
			originalDate: deviation.original_date,
			originalStartTime: deviation.original_start_time,
			reason: deviation.reason,
			isRecurring: !!deviation.spans_future_occurrences,
			cancellationType: meta.cancellationType,
			needsReschedule: meta.needsReschedule,
		},
	});
}

function pushSpanningDeviationEvent(
	events: CalendarEvent[],
	deviation: LessonAppointmentDeviationWithAgreement,
	firstAgreement: LessonAgreementWithStudent,
	eventId: string,
	durationMinutes: number,
	currentLessonDate: Date,
): void {
	const eventDate = applyTimeToDate(
		getDateForDayOfWeek(new Date(deviation.actual_date).getDay(), currentLessonDate),
		deviation.actual_start_time,
	);
	const lesson = deviation.lesson_agreement ?? firstAgreement;
	const student = resolveDeviationStudent(lesson, firstAgreement);
	const lessonType = resolveDeviationLessonType(lesson, deviation.agenda_event?.title, firstAgreement);
	const meta = deviationCancellationMeta(deviation);
	events.push({
		title: `${lessonType.name} - ${student.studentName}`,
		start: eventDate,
		end: addMinutes(eventDate, durationMinutes),
		resource: {
			type: 'deviation',
			agreementId: firstAgreement.id,
			eventId,
			deviationId: deviation.id,
			studentName: student.studentName,
			user: student.userInfo,
			lessonTypeName: lessonType.name,
			lessonTypeColor: lessonType.color,
			lessonTypeIcon: lessonType.icon,
			isDeviation: !deviation.is_cancelled,
			hasTimeOrDateChange: hasActiveTimeOrDateChange(deviation),
			isCancelled: deviation.is_cancelled,
			isGroupLesson: false,
			originalDate: deviation.original_date,
			originalStartTime: deviation.original_start_time,
			reason: deviation.reason,
			isRecurring: true,
			cancellationType: meta.cancellationType,
			needsReschedule: meta.needsReschedule,
		},
	});
}

function pushDefaultGroupedOccurrence(
	events: CalendarEvent[],
	group: LessonAgreementWithStudent[],
	firstAgreement: LessonAgreementWithStudent,
	currentLessonDate: Date,
	eventId: string | undefined,
	studentNames: string[],
): void {
	const isGroupLesson = firstAgreement.lesson_types.is_group_lesson;
	const eventDate = applyTimeToDate(new Date(currentLessonDate), firstAgreement.start_time);
	const users = group
		.map((a) => buildParticipantInfo(a.profiles as UserOptional | null, a.student_user_id))
		.filter((info): info is User => info !== undefined);
	events.push({
		title: isGroupLesson
			? `${firstAgreement.lesson_types.name} (${group.length} deelnemers)`
			: `${firstAgreement.lesson_types.name} - ${studentNames[0]}`,
		start: eventDate,
		end: addMinutes(eventDate, firstAgreement.duration_minutes),
		resource: {
			type: 'agreement',
			agreementId: firstAgreement.id,
			eventId: eventId ?? undefined,
			studentName: isGroupLesson ? studentNames.join(', ') : studentNames[0],
			user: !isGroupLesson && users.length > 0 ? users[0] : undefined,
			users: isGroupLesson ? users : undefined,
			lessonTypeName: firstAgreement.lesson_types.name,
			lessonTypeColor: firstAgreement.lesson_types.color,
			lessonTypeIcon: firstAgreement.lesson_types.icon,
			isDeviation: false,
			isCancelled: false,
			isGroupLesson,
			studentCount: isGroupLesson ? group.length : undefined,
		},
	});
}

function tryPushIndividualDeviationOccurrence(
	events: CalendarEvent[],
	params: {
		group: LessonAgreementWithStudent[];
		firstAgreement: LessonAgreementWithStudent;
		eventId: string | undefined;
		lessonDateStr: string;
		currentLessonDate: Date;
		deviations: Map<string, LessonAppointmentDeviationWithAgreement>;
		recurringByEventId?: Map<string, LessonAppointmentDeviationWithAgreement[]>;
	},
): boolean {
	const { group, firstAgreement, eventId, lessonDateStr, currentLessonDate, deviations, recurringByEventId } = params;
	if (firstAgreement.lesson_types.is_group_lesson || group.length !== 1 || !eventId) return false;
	const deviation = deviations.get(`${eventId}-${lessonDateStr}`);
	if (deviation) {
		pushSingleDateDeviationEvent(events, deviation, firstAgreement, eventId, firstAgreement.duration_minutes);
		return true;
	}
	const recurringDeviation = getRecurringDeviationForDate(recurringByEventId ?? new Map(), eventId, lessonDateStr);
	if (!recurringDeviation) return false;
	pushSpanningDeviationEvent(
		events,
		recurringDeviation,
		firstAgreement,
		eventId,
		firstAgreement.duration_minutes,
		currentLessonDate,
	);
	return true;
}

export function generateRecurringEvents(
	agreements: LessonAgreementWithStudent[],
	rangeStart: Date,
	rangeEnd: Date,
	deviations: Map<string, LessonAppointmentDeviationWithAgreement>,
	recurringByEventId?: Map<string, LessonAppointmentDeviationWithAgreement[]>,
	eventIdByAgreementId?: Map<string, string>,
): CalendarEvent[] {
	const events: CalendarEvent[] = [];

	for (const [, group] of groupAgreementsBySchedule(agreements)) {
		const firstAgreement = group[0];
		const frequency = getFrequency(firstAgreement);
		const eventId = eventIdByAgreementId?.get(firstAgreement.id);
		const studentNames = group.map((a) => getDisplayName(a.profiles));
		const { earliestStartDate, latestEndDate } = resolveGroupedAgreementDateWindow(group);
		const currentLessonDate = getFirstOccurrenceInRange(firstAgreement, rangeStart, frequency);

		while (currentLessonDate <= rangeEnd) {
			if (isDateInsideAgreementWindow(currentLessonDate, earliestStartDate, latestEndDate)) {
				const pushedDeviation = tryPushIndividualDeviationOccurrence(events, {
					group,
					firstAgreement,
					eventId,
					lessonDateStr: formatDateToDb(currentLessonDate),
					currentLessonDate,
					deviations,
					recurringByEventId,
				});
				if (!pushedDeviation) {
					pushDefaultGroupedOccurrence(
						events,
						group,
						firstAgreement,
						currentLessonDate,
						eventId,
						studentNames,
					);
				}
			}
			addInterval(currentLessonDate, frequency);
		}
	}

	return events;
}
