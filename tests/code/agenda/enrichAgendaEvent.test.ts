import { describe, expect, it } from 'bun:test';
import type { CalendarEvent } from '../../../src/components/agenda/types';
import { enrichAgendaEvent } from '../../../src/lib/agenda/enrichAgendaEvent';
import type { EnrichAgendaEventContext } from '../../../src/lib/agenda/enrichAgendaEventContext';
import type { AgendaEventDeviationRow } from '../../../src/types/agenda-events';
import type { AgendaLessonAgreement } from '../../../src/types/lesson-agreements';
import type { ProjectInfo } from '../../../src/types/projects';
import type { User } from '../../../src/types/users';

function mockEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
	return {
		title: 'Afspraak',
		start: new Date('2026-09-07T14:00:00'),
		end: new Date('2026-09-07T15:00:00'),
		resource: {
			type: 'agenda',
			agreementId: 'source-1',
			eventId: 'event-1',
			studentName: 'Onbekend',
			lessonTypeName: 'Onbekend',
			lessonTypeColor: null,
			lessonTypeIcon: null,
			isDeviation: false,
			isCancelled: false,
			isGroupLesson: false,
			sourceType: 'manual',
		},
		...overrides,
	};
}

function emptyContext(overrides: Partial<EnrichAgendaEventContext> = {}): EnrichAgendaEventContext {
	return {
		participantCountByEventId: new Map(),
		participantNamesByEventId: new Map(),
		participantUserIdsByEventId: new Map(),
		participantCountByDeviationId: new Map(),
		participantNamesByDeviationId: new Map(),
		projectsMap: new Map(),
		lessonGroupsMap: new Map(),
		agreementsMap: new Map(),
		deviationsByEventId: new Map(),
		profileMap: new Map(),
		viewerUserId: undefined,
		...overrides,
	};
}

const studentProfile: User = {
	user_id: 'stu-1',
	first_name: 'Jan',
	last_name: 'Jansen',
	email: 'jan@example.com',
	avatar_url: null,
	phone_number: null,
};

const teacherProfile: User = {
	user_id: 'tea-1',
	first_name: 'Piet',
	last_name: 'Docent',
	email: 'piet@example.com',
	avatar_url: null,
	phone_number: null,
};

describe('enrichAgendaEvent', () => {
	it('adds participant count and names from the event map', () => {
		const ctx = emptyContext({
			participantCountByEventId: new Map([['event-1', 3]]),
			participantNamesByEventId: new Map([['event-1', ['Jan', 'Piet', 'Kees']]]),
		});
		const result = enrichAgendaEvent(mockEvent(), ctx);
		expect(result.resource.participantCount).toBe(3);
		expect(result.resource.participantNames).toEqual(['Jan', 'Piet', 'Kees']);
	});

	it('prefers deviation participant data when a deviation id is present', () => {
		const ctx = emptyContext({
			participantCountByDeviationId: new Map([['dev-1', 2]]),
			participantNamesByDeviationId: new Map([['dev-1', ['Anna', 'Bo']]]),
		});
		const result = enrichAgendaEvent(
			mockEvent({ resource: { ...mockEvent().resource, deviationId: 'dev-1' } }),
			ctx,
		);
		expect(result.resource.participantCount).toBe(2);
		expect(result.resource.participantNames).toEqual(['Anna', 'Bo']);
	});

	it('enriches project events with project metadata', () => {
		const project: ProjectInfo = { id: 'proj-1', name: 'Eindexamen' };
		const ctx = emptyContext({ projectsMap: new Map([['proj-1', project]]) });
		const result = enrichAgendaEvent(
			mockEvent({
				title: 'Repetitie',
				resource: {
					...mockEvent().resource,
					sourceType: 'project',
					agreementId: 'proj-1',
				},
			}),
			ctx,
		);
		expect(result.title).toBe('Eindexamen - Repetitie');
		expect(result.resource.projectName).toBe('Eindexamen');
		expect(result.resource.studentName).toBe('Eindexamen');
	});

	it('uses only the project name when the appointment title is blank', () => {
		const project: ProjectInfo = { id: 'proj-1', name: 'Eindexamen' };
		const ctx = emptyContext({ projectsMap: new Map([['proj-1', project]]) });
		const result = enrichAgendaEvent(
			mockEvent({
				title: '   ',
				resource: {
					...mockEvent().resource,
					sourceType: 'project',
					agreementId: 'proj-1',
				},
			}),
			ctx,
		);
		expect(result.title).toBe('Eindexamen');
	});

	it('enriches lesson group events with member names and counts', () => {
		const ctx = emptyContext({
			lessonGroupsMap: new Map([
				[
					'group-1',
					{
						id: 'group-1',
						name: 'Groep A',
						lessonTypeName: 'Zang',
						lessonTypeIcon: 'mic',
						lessonTypeColor: '#123456',
						memberUserIds: ['stu-1', 'stu-2'],
					},
				],
			]),
			profileMap: new Map([
				['stu-1', studentProfile],
				[
					'stu-2',
					{
						user_id: 'stu-2',
						first_name: 'Anna',
						last_name: 'Bakker',
						email: 'anna@example.com',
						avatar_url: null,
						phone_number: null,
					},
				],
			]),
		});
		const result = enrichAgendaEvent(
			mockEvent({
				resource: {
					...mockEvent().resource,
					sourceType: 'lesson_group',
					agreementId: 'group-1',
					color: '#abcdef',
				},
			}),
			ctx,
		);
		expect(result.title).toBe('Groep A (2)');
		expect(result.resource.isGroupLesson).toBe(true);
		expect(result.resource.studentName).toBe('Jan Jansen, Anna Bakker');
		expect(result.resource.lessonTypeColor).toBe('#abcdef');
	});

	it('adds cancelled participant ids from deviations for lesson groups', () => {
		const deviation: AgendaEventDeviationRow = {
			id: 'dev-1',
			event_id: 'event-1',
			original_date: '2026-09-07',
			original_start_time: '14:00:00',
			actual_date: '2026-09-07',
			actual_start_time: '14:00:00',
			is_cancelled: false,
			needs_reschedule: false,
			title: null,
			description: null,
			color: null,
			spans_future_occurrences: false,
			spans_end_date: null,
			cancellation_type: null,
			cancelled_participant_ids: ['stu-2'],
			participant_ids: null,
			reason: null,
			created_at: '2026-01-01T00:00:00Z',
			updated_at: '2026-01-01T00:00:00Z',
			created_by: null,
			updated_by: null,
		};
		const deviationsByEventId = new Map<string, Map<string, AgendaEventDeviationRow>>([
			['event-1', new Map([['2026-09-07', deviation]])],
		]);
		const ctx = emptyContext({
			lessonGroupsMap: new Map([
				[
					'group-1',
					{
						id: 'group-1',
						name: 'Groep A',
						lessonTypeName: 'Zang',
						lessonTypeIcon: 'mic',
						lessonTypeColor: '#123456',
						memberUserIds: ['stu-1'],
					},
				],
			]),
			deviationsByEventId,
			profileMap: new Map([['stu-1', studentProfile]]),
		});
		const result = enrichAgendaEvent(
			mockEvent({
				resource: {
					...mockEvent().resource,
					sourceType: 'lesson_group',
					agreementId: 'group-1',
					originalDate: '2026-09-07',
				},
			}),
			ctx,
		);
		expect(result.resource.cancelledParticipantIds).toEqual(['stu-2']);
	});

	it('enriches single-student lesson agreement events', () => {
		const agreement: AgendaLessonAgreement = {
			id: 'agr-1',
			day_of_week: 1,
			start_time: '14:00',
			start_date: '2026-09-01',
			end_date: null,
			is_active: true,
			student_user_id: 'stu-1',
			lesson_type_id: 'lt-1',
			duration_minutes: 60,
			frequency: 'weekly',
			price_per_lesson: 30,
			profiles: studentProfile,
			lesson_types: {
				id: 'lt-1',
				name: 'Piano',
				icon: 'piano',
				color: '#10b981',
				is_group_lesson: false,
			},
			teacherUserId: 'tea-1',
			teacherProfile: teacherProfile,
		};
		const ctx = emptyContext({
			agreementsMap: new Map([['agr-1', agreement]]),
			participantUserIdsByEventId: new Map([['event-1', ['stu-1', 'tea-1']]]),
			profileMap: new Map([
				['stu-1', studentProfile],
				['tea-1', teacherProfile],
			]),
			viewerUserId: 'tea-1',
		});
		const result = enrichAgendaEvent(
			mockEvent({
				resource: {
					...mockEvent().resource,
					sourceType: 'lesson_agreement',
					agreementId: 'agr-1',
				},
			}),
			ctx,
		);
		expect(result.title).toBe('Jan Jansen');
		expect(result.resource.teacherName).toBe('Piet Docent');
		expect(result.resource.viewerIsTeacher).toBe(true);
		expect(result.resource.isDuoLesson).toBe(false);
		expect(result.resource.user?.user_id).toBe('stu-1');
	});

	it('enriches duo lesson agreement events with both student names', () => {
		const agreement: AgendaLessonAgreement = {
			id: 'agr-1',
			day_of_week: 1,
			start_time: '14:00',
			start_date: '2026-09-01',
			end_date: null,
			is_active: true,
			student_user_id: 'stu-1',
			lesson_type_id: 'lt-1',
			duration_minutes: 60,
			frequency: 'weekly',
			price_per_lesson: 30,
			profiles: studentProfile,
			lesson_types: {
				id: 'lt-1',
				name: 'Piano',
				icon: 'piano',
				color: '#10b981',
				is_group_lesson: false,
			},
			teacherUserId: 'tea-1',
			teacherProfile: teacherProfile,
		};
		const duoStudent: User = {
			user_id: 'stu-2',
			first_name: 'Anna',
			last_name: 'Bakker',
			email: 'anna@example.com',
			avatar_url: null,
			phone_number: null,
		};
		const ctx = emptyContext({
			agreementsMap: new Map([['agr-1', agreement]]),
			participantUserIdsByEventId: new Map([['event-1', ['stu-1', 'stu-2', 'tea-1']]]),
			profileMap: new Map([
				['stu-1', studentProfile],
				['stu-2', duoStudent],
				['tea-1', teacherProfile],
			]),
		});
		const result = enrichAgendaEvent(
			mockEvent({
				resource: {
					...mockEvent().resource,
					sourceType: 'lesson_agreement',
					agreementId: 'agr-1',
				},
			}),
			ctx,
		);
		expect(result.title).toBe('Anna & Jan');
		expect(result.resource.isDuoLesson).toBe(true);
		expect(result.resource.users).toHaveLength(2);
	});

	it('shows the teacher name in the title when the viewer is the student', () => {
		const agreement: AgendaLessonAgreement = {
			id: 'agr-1',
			day_of_week: 1,
			start_time: '14:00',
			start_date: '2026-09-01',
			end_date: null,
			is_active: true,
			student_user_id: 'stu-1',
			lesson_type_id: 'lt-1',
			duration_minutes: 60,
			frequency: 'weekly',
			price_per_lesson: 30,
			profiles: studentProfile,
			lesson_types: {
				id: 'lt-1',
				name: 'Piano',
				icon: 'piano',
				color: '#10b981',
				is_group_lesson: false,
			},
			teacherUserId: 'tea-1',
			teacherProfile: teacherProfile,
		};
		const ctx = emptyContext({
			agreementsMap: new Map([['agr-1', agreement]]),
			participantUserIdsByEventId: new Map([['event-1', ['stu-1', 'tea-1']]]),
			profileMap: new Map([
				['stu-1', studentProfile],
				['tea-1', teacherProfile],
			]),
			viewerUserId: 'stu-1',
		});
		const result = enrichAgendaEvent(
			mockEvent({
				resource: {
					...mockEvent().resource,
					sourceType: 'lesson_agreement',
					agreementId: 'agr-1',
				},
			}),
			ctx,
		);
		expect(result.title).toBe('Piet Docent');
		expect(result.resource.viewerIsTeacher).toBe(false);
		expect(result.resource.studentName).toBe('Jan Jansen');
	});

	it('returns the event unchanged when no enrichment source matches', () => {
		const event = mockEvent();
		const result = enrichAgendaEvent(event, emptyContext());
		expect(result.title).toBe('Afspraak');
		expect(result.resource.studentName).toBe('Onbekend');
	});
});
