import type { ReactNode } from 'react';
import type { CalendarEventResource } from '@/components/agenda/types';
import { agendaDefaultForegroundClass, resolveAgendaDefaultKind } from '@/lib/agenda/agenda-default-style-vars';
import { isLightColor } from '@/lib/color/color-utils';
import { formatTimeFromDate } from '@/lib/time/time-format';

export type AgendaEventIconType = 'trial' | 'project' | 'lesson_group' | 'duo' | 'lesson' | 'multi_participant' | null;

export interface AgendaEventTypeFlags {
	isLessonGroupEvent: boolean;
	isLessonEvent: boolean;
	isProjectEvent: boolean;
	isTrialEvent: boolean;
	isDuoLesson: boolean;
	hasMultipleParticipants: boolean;
}

export function getEventDurationMinutes(start: Date | undefined, end: Date | undefined): number {
	if (!start || !end) return 30;
	return Math.round((end.getTime() - start.getTime()) / 60000);
}

export function getLineClampClassForDuration(durationMinutes: number): string {
	if (durationMinutes <= 30) return 'line-clamp-1';
	if (durationMinutes <= 45) return 'line-clamp-2';
	if (durationMinutes <= 60) return 'line-clamp-3';
	return 'line-clamp-4';
}

export function getAgendaEventDisplayTitle(view: string, start: Date | undefined, title: ReactNode): ReactNode {
	if (view === 'month' && start) {
		return `${formatTimeFromDate(start)} ${title}`;
	}
	return title;
}

export function getAgendaEventIconColorClass(
	color: string | null | undefined,
	lessonTypeColor: string | null,
	resource: CalendarEventResource,
	view?: string,
): string {
	// List agenda has no colored event chrome; use theme foreground so icons stay readable in light and dark.
	if (view === 'agenda') return 'text-muted-foreground';

	const customColor = color || lessonTypeColor;
	if (customColor) {
		return isLightColor(customColor) ? 'text-gray-900' : 'text-white';
	}
	const kind = resolveAgendaDefaultKind(resource) ?? 'lesson';
	return agendaDefaultForegroundClass(kind);
}

export function buildAgendaEventTypeFlags(resource: CalendarEventResource): AgendaEventTypeFlags {
	const hasMultipleParticipants = (resource.participantCount ?? 0) > 1;
	const isLessonGroupEvent = resource.sourceType === 'lesson_group';
	const isLessonEvent = Boolean(resource.isLesson) || resource.sourceType === 'lesson_agreement';
	const isProjectEvent = resource.sourceType === 'project';
	const isTrialEvent = resource.sourceType === 'trial_lesson';

	return {
		isLessonGroupEvent,
		isLessonEvent,
		isProjectEvent,
		isTrialEvent,
		isDuoLesson: Boolean(resource.isDuoLesson),
		hasMultipleParticipants,
	};
}

export function resolveAgendaEventIconType(flags: AgendaEventTypeFlags): AgendaEventIconType {
	if (flags.isTrialEvent) return 'trial';
	if (flags.isProjectEvent) return 'project';
	if (flags.isLessonGroupEvent) return 'lesson_group';
	if (flags.isLessonEvent && !flags.isProjectEvent && !flags.isLessonGroupEvent && flags.isDuoLesson) {
		return 'duo';
	}
	if (flags.isLessonEvent && !flags.isProjectEvent && !flags.isLessonGroupEvent && !flags.isDuoLesson) {
		return 'lesson';
	}
	if (!flags.isLessonEvent && !flags.isProjectEvent && !flags.isLessonGroupEvent && flags.hasMultipleParticipants) {
		return 'multi_participant';
	}
	return null;
}

export function getCancellationBanTitle(isTeacherCancelled: boolean): string {
	return isTeacherCancelled ? 'Docent heeft afgezegd (inhalen vereist)' : 'Leerling heeft afgezegd';
}
