import type { CalendarEvent } from '@/components/agenda/types';
import type { LessonGroupInfo } from '@/lib/agenda/enrichAgendaEventContext';
import type { AgendaLessonAgreement } from '@/types/lesson-agreements';

export interface AgendaLessonTypeFilterOption {
	id: string;
	name: string;
	icon: string | null;
	color: string | null;
}

/** Single selection for the agenda lesson-type filter. */
export type AgendaLessonTypeFilterSelection =
	| { kind: 'all' }
	| { kind: 'non-lessons' }
	| { kind: 'lesson-type'; lessonTypeId: string };

export const AGENDA_LESSON_TYPE_FILTER_ALL: AgendaLessonTypeFilterSelection = { kind: 'all' };

export const AGENDA_LESSON_TYPE_FILTER_VALUE_ALL = 'all';
export const AGENDA_LESSON_TYPE_FILTER_VALUE_NON_LESSONS = 'non-lessons';

function compareLessonTypeOptionName(a: AgendaLessonTypeFilterOption, b: AgendaLessonTypeFilterOption): number {
	return a.name.localeCompare(b.name, 'nl');
}

/** Unique lesson types from loaded agenda agreements and groups, sorted by name. */
export function collectAgendaLessonTypeFilterOptions(
	agreements: Iterable<AgendaLessonAgreement>,
	lessonGroups: Iterable<LessonGroupInfo>,
): AgendaLessonTypeFilterOption[] {
	const byId = new Map<string, AgendaLessonTypeFilterOption>();

	for (const agreement of agreements) {
		const id = agreement.lesson_type_id;
		if (!id || byId.has(id)) continue;
		byId.set(id, {
			id,
			name: agreement.lesson_types.name,
			icon: agreement.lesson_types.icon,
			color: agreement.lesson_types.color,
		});
	}

	for (const group of lessonGroups) {
		const id = group.lessonTypeId;
		if (!id || byId.has(id)) continue;
		byId.set(id, {
			id,
			name: group.lessonTypeName ?? group.name,
			icon: group.lessonTypeIcon,
			color: group.lessonTypeColor,
		});
	}

	return [...byId.values()].sort(compareLessonTypeOptionName);
}

/** Stable string value for a filter selection (trigger/list item keys). */
export function agendaLessonTypeFilterSelectionToValue(selection: AgendaLessonTypeFilterSelection): string {
	if (selection.kind === 'all') return AGENDA_LESSON_TYPE_FILTER_VALUE_ALL;
	if (selection.kind === 'non-lessons') return AGENDA_LESSON_TYPE_FILTER_VALUE_NON_LESSONS;
	return selection.lessonTypeId;
}

/** Parse a filter value string into a selection. */
export function agendaLessonTypeFilterValueToSelection(value: string): AgendaLessonTypeFilterSelection {
	if (value === AGENDA_LESSON_TYPE_FILTER_VALUE_ALL) return AGENDA_LESSON_TYPE_FILTER_ALL;
	if (value === AGENDA_LESSON_TYPE_FILTER_VALUE_NON_LESSONS) return { kind: 'non-lessons' };
	return { kind: 'lesson-type', lessonTypeId: value };
}

/** Effective selection for UI and filtering; missing lesson-type ids fall back to all. */
export function resolveAgendaLessonTypeFilterSelection(
	selection: AgendaLessonTypeFilterSelection,
	options: readonly AgendaLessonTypeFilterOption[],
): AgendaLessonTypeFilterSelection {
	if (selection.kind !== 'lesson-type') return selection;
	const stillAvailable = options.some((option) => option.id === selection.lessonTypeId);
	if (stillAvailable) return selection;
	return AGENDA_LESSON_TYPE_FILTER_ALL;
}

/** Apply the current filter selection to calendar events. */
export function filterAgendaEventsByLessonTypeSelection(
	events: CalendarEvent[],
	selection: AgendaLessonTypeFilterSelection,
): CalendarEvent[] {
	if (selection.kind === 'all') return events;
	if (selection.kind === 'non-lessons') {
		return events.filter((event) => !event.resource.isLesson);
	}
	const lessonTypeId = selection.lessonTypeId;
	return events.filter((event) => event.resource.lessonTypeId === lessonTypeId);
}
