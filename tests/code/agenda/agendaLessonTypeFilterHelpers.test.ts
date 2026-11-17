import { describe, expect, it } from 'bun:test';
import type { CalendarEvent } from '../../../src/components/agenda/types';
import {
	AGENDA_LESSON_TYPE_FILTER_VALUE_ALL,
	AGENDA_LESSON_TYPE_FILTER_VALUE_NON_LESSONS,
	agendaLessonTypeFilterSelectionToValue,
	agendaLessonTypeFilterValueToSelection,
	collectAgendaLessonTypeFilterOptions,
	filterAgendaEventsByLessonTypeSelection,
	resolveAgendaLessonTypeFilterSelection,
} from '../../../src/lib/agenda/agendaLessonTypeFilterHelpers';
import type { LessonGroupInfo } from '../../../src/lib/agenda/enrichAgendaEventContext';
import type { AgendaLessonAgreement } from '../../../src/types/lesson-agreements';

function mockAgreement(overrides: {
	id?: string;
	lesson_type_id: string;
	name: string;
	icon?: string;
	color?: string;
}): AgendaLessonAgreement {
	return {
		id: overrides.id ?? `agr-${overrides.lesson_type_id}`,
		day_of_week: 1,
		start_time: '14:00',
		start_date: '2026-01-01',
		end_date: null,
		is_active: true,
		student_user_id: 'stu-1',
		lesson_type_id: overrides.lesson_type_id,
		duration_minutes: 30,
		frequency: 'weekly',
		price_per_lesson: 30,
		notes: null,
		profiles: { first_name: 'Jan', last_name: 'Jansen', email: 'jan@example.com' },
		lesson_types: {
			id: overrides.lesson_type_id,
			name: overrides.name,
			icon: overrides.icon ?? '',
			color: overrides.color ?? '',
			is_group_lesson: false,
		},
	};
}

function mockGroup(overrides: {
	id: string;
	lessonTypeId: string | null;
	lessonTypeName: string | null;
	name?: string;
}): LessonGroupInfo {
	return {
		id: overrides.id,
		name: overrides.name ?? 'Groep',
		lessonTypeId: overrides.lessonTypeId,
		lessonTypeName: overrides.lessonTypeName,
		lessonTypeIcon: null,
		lessonTypeColor: null,
		memberUserIds: [],
		notes: null,
	};
}

function mockEvent(
	overrides: { lessonTypeId?: string | null; isLesson?: boolean; title?: string } = {},
): CalendarEvent {
	return {
		title: overrides.title ?? 'Afspraak',
		start: new Date('2026-02-17T14:00:00'),
		end: new Date('2026-02-17T15:00:00'),
		resource: {
			type: 'agenda',
			agreementId: 'agr-1',
			eventId: 'event-1',
			studentName: 'Anna',
			lessonTypeName: overrides.title ?? 'Afspraak',
			lessonTypeColor: null,
			lessonTypeIcon: null,
			lessonTypeId: overrides.lessonTypeId,
			isDeviation: false,
			isCancelled: false,
			isGroupLesson: false,
			isLesson: overrides.isLesson ?? false,
		},
	};
}

describe('collectAgendaLessonTypeFilterOptions', () => {
	it('returns unique lesson types from agreements and groups sorted by name', () => {
		const options = collectAgendaLessonTypeFilterOptions(
			[
				mockAgreement({ lesson_type_id: 'lt-drums', name: 'Drumles', icon: 'drums', color: '#111' }),
				mockAgreement({
					id: 'agr-2',
					lesson_type_id: 'lt-drums',
					name: 'Drumles',
					icon: 'drums',
					color: '#111',
				}),
				mockAgreement({ lesson_type_id: 'lt-guitar', name: 'Gitaarles' }),
			],
			[
				mockGroup({ id: 'grp-1', lessonTypeId: 'lt-band', lessonTypeName: 'Bandcoaching' }),
				mockGroup({ id: 'grp-2', lessonTypeId: 'lt-drums', lessonTypeName: 'Drumles' }),
			],
		);

		expect(options).toEqual([
			{ id: 'lt-band', name: 'Bandcoaching', icon: null, color: null },
			{ id: 'lt-drums', name: 'Drumles', icon: 'drums', color: '#111' },
			{ id: 'lt-guitar', name: 'Gitaarles', icon: '', color: '' },
		]);
	});

	it('skips groups without a lesson type id and uses group name as fallback label', () => {
		const options = collectAgendaLessonTypeFilterOptions(
			[],
			[
				mockGroup({ id: 'grp-1', lessonTypeId: null, lessonTypeName: 'Negeer' }),
				mockGroup({
					id: 'grp-2',
					lessonTypeId: 'lt-choir',
					lessonTypeName: null,
					name: 'Koor A',
				}),
			],
		);

		expect(options).toEqual([{ id: 'lt-choir', name: 'Koor A', icon: null, color: null }]);
	});
});

describe('filterAgendaEventsByLessonTypeSelection', () => {
	it('returns the same list when selection is all', () => {
		const events = [mockEvent({ lessonTypeId: 'lt-drums', isLesson: true }), mockEvent({ title: 'Meeting' })];
		expect(filterAgendaEventsByLessonTypeSelection(events, { kind: 'all' })).toBe(events);
	});

	it('keeps only non-lesson events when selection is non-lessons', () => {
		const drums = mockEvent({ lessonTypeId: 'lt-drums', isLesson: true, title: 'Drum' });
		const guitar = mockEvent({ lessonTypeId: 'lt-guitar', isLesson: true, title: 'Gitaar' });
		const meeting = mockEvent({ title: 'Meeting' });
		const project = mockEvent({ lessonTypeId: null, isLesson: false, title: 'Project' });
		const result = filterAgendaEventsByLessonTypeSelection([drums, guitar, meeting, project], {
			kind: 'non-lessons',
		});
		expect(result).toEqual([meeting, project]);
	});

	it('keeps only events of the selected lesson type', () => {
		const drums = mockEvent({ lessonTypeId: 'lt-drums', isLesson: true, title: 'Drum' });
		const guitar = mockEvent({ lessonTypeId: 'lt-guitar', isLesson: true, title: 'Gitaar' });
		const meeting = mockEvent({ title: 'Meeting' });
		const result = filterAgendaEventsByLessonTypeSelection([drums, guitar, meeting], {
			kind: 'lesson-type',
			lessonTypeId: 'lt-drums',
		});
		expect(result).toEqual([drums]);
	});
});

describe('agendaLessonTypeFilterSelectionToValue / agendaLessonTypeFilterValueToSelection', () => {
	it('round-trips all, non-lessons, and lesson-type selections', () => {
		expect(agendaLessonTypeFilterSelectionToValue({ kind: 'all' })).toBe(AGENDA_LESSON_TYPE_FILTER_VALUE_ALL);
		expect(agendaLessonTypeFilterSelectionToValue({ kind: 'non-lessons' })).toBe(
			AGENDA_LESSON_TYPE_FILTER_VALUE_NON_LESSONS,
		);
		expect(agendaLessonTypeFilterSelectionToValue({ kind: 'lesson-type', lessonTypeId: 'lt-drums' })).toBe(
			'lt-drums',
		);

		expect(agendaLessonTypeFilterValueToSelection(AGENDA_LESSON_TYPE_FILTER_VALUE_ALL)).toEqual({ kind: 'all' });
		expect(agendaLessonTypeFilterValueToSelection(AGENDA_LESSON_TYPE_FILTER_VALUE_NON_LESSONS)).toEqual({
			kind: 'non-lessons',
		});
		expect(agendaLessonTypeFilterValueToSelection('lt-drums')).toEqual({
			kind: 'lesson-type',
			lessonTypeId: 'lt-drums',
		});
	});
});

describe('resolveAgendaLessonTypeFilterSelection', () => {
	it('keeps a lesson-type selection when that option is still available', () => {
		const selection = resolveAgendaLessonTypeFilterSelection({ kind: 'lesson-type', lessonTypeId: 'lt-drums' }, [
			{ id: 'lt-drums', name: 'Drumles', icon: null, color: null },
		]);
		expect(selection).toEqual({ kind: 'lesson-type', lessonTypeId: 'lt-drums' });
	});

	it('falls back to all when the selected lesson type is gone', () => {
		const selection = resolveAgendaLessonTypeFilterSelection({ kind: 'lesson-type', lessonTypeId: 'lt-gone' }, [
			{ id: 'lt-drums', name: 'Drumles', icon: null, color: null },
		]);
		expect(selection).toEqual({ kind: 'all' });
	});
});
