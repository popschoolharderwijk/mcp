import { describe, expect, it } from 'bun:test';
import { buildAgendaViewDerivedState } from '../../../src/components/agenda/agendaViewDerivedState';
import type { CalendarEvent } from '../../../src/components/agenda/types';
import type { AgendaEventDeviationRow } from '../../../src/types/agenda-events';
import type { AgendaLessonAgreement } from '../../../src/types/lesson-agreements';

type MockAgendaUI = {
	selectedEvent: CalendarEvent | null;
	editingEvent: { id: string; source_type: string; source_id: string | null } | null;
};

function mockCalendarEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
	return {
		title: 'Les',
		start: new Date('2026-09-07T14:00:00'),
		end: new Date('2026-09-07T15:00:00'),
		resource: {
			type: 'agenda',
			agreementId: 'agr-1',
			eventId: 'event-1',
			studentName: 'Jan Jansen',
			lessonTypeName: 'Piano',
			lessonTypeColor: '#000000',
			lessonTypeIcon: 'piano',
			isDeviation: false,
			isCancelled: false,
			isGroupLesson: false,
			originalDate: '2026-09-07',
		},
		...overrides,
	};
}

function mockAgreement(overrides: Partial<AgendaLessonAgreement> = {}): AgendaLessonAgreement {
	return {
		id: 'agr-1',
		day_of_week: 1,
		start_time: '09:00:00',
		start_date: '2026-09-01',
		end_date: '2027-07-31',
		is_active: true,
		notes: null,
		student_user_id: 'stu-1',
		lesson_type_id: 'lt-1',
		duration_minutes: 60,
		frequency: 'weekly',
		price_per_lesson: 30,
		teacherUserId: 'tea-1',
		profiles: null,
		teacherProfile: null,
		lesson_types: { id: 'lt-1', name: 'Piano', icon: 'piano', color: '#000000', is_group_lesson: false },
		...overrides,
	};
}

function mockDeviation(overrides: Partial<AgendaEventDeviationRow> = {}): AgendaEventDeviationRow {
	return {
		id: 'dev-1',
		event_id: 'event-1',
		original_date: '2026-09-07',
		original_start_time: '09:00:00',
		actual_date: '2026-09-07',
		actual_start_time: '14:30:00',
		spans_future_occurrences: false,
		spans_end_date: null,
		is_cancelled: false,
		needs_reschedule: false,
		cancellation_type: null,
		cancelled_participant_ids: null,
		title: 'Aangepaste titel',
		description: 'Notitie',
		color: '#ff0000',
		participant_ids: ['stu-1', 'stu-2'],
		reason: null,
		created_at: '2026-01-01T00:00:00Z',
		created_by: null,
		updated_at: '2026-01-01T00:00:00Z',
		updated_by: null,
		...overrides,
	};
}

function buildState(
	ui: MockAgendaUI,
	overrides: Partial<{
		deviationsByEventId: Map<string, Map<string, AgendaEventDeviationRow>>;
		agreementsMap: Map<string, AgendaLessonAgreement>;
		effectiveUserId: string | undefined;
		isPrivileged: boolean;
	}> = {},
) {
	return buildAgendaViewDerivedState({
		ui: ui as ReturnType<typeof import('../../../src/hooks/useAgendaUI').useAgendaUI>,
		deviationsByEventId: overrides.deviationsByEventId ?? new Map(),
		agreementsMap: overrides.agreementsMap ?? new Map(),
		effectiveUserId: overrides.effectiveUserId,
		isPrivileged: overrides.isPrivileged ?? false,
	});
}

describe('buildAgendaViewDerivedState', () => {
	it('returns empty defaults when nothing is selected', () => {
		const result = buildState({ selectedEvent: null, editingEvent: null });
		expect(result).toEqual({
			occurrenceParticipantIds: null,
			occurrenceParticipantProfiles: null,
			occurrenceOverrides: null,
			occurrenceTimes: { start: null, end: null },
			editingAgreement: undefined,
			readonlyParticipantIds: [],
			canAddParticipants: false,
			deviationInfo: null,
			lessonType: null,
		});
	});

	it('reads occurrence participant overrides from deviations', () => {
		const deviation = mockDeviation();
		const deviationsByEventId = new Map([['event-1', new Map([['2026-09-07', deviation]])]]);
		const ui: MockAgendaUI = {
			selectedEvent: mockCalendarEvent(),
			editingEvent: { id: 'event-1', source_type: 'manual', source_id: null },
		};
		const result = buildState(ui, { deviationsByEventId });
		expect(result.occurrenceParticipantIds).toEqual(['stu-1', 'stu-2']);
		expect(result.occurrenceOverrides).toEqual({
			title: 'Aangepaste titel',
			description: 'Notitie',
			color: '#ff0000',
		});
	});

	it('returns null participant ids when deviation has an empty participant list', () => {
		const deviation = mockDeviation({ participant_ids: [] });
		const deviationsByEventId = new Map([['event-1', new Map([['2026-09-07', deviation]])]]);
		const ui: MockAgendaUI = {
			selectedEvent: mockCalendarEvent(),
			editingEvent: { id: 'event-1', source_type: 'manual', source_id: null },
		};
		const result = buildState(ui, { deviationsByEventId });
		expect(result.occurrenceParticipantIds).toBeNull();
	});

	it('uses merged same-slot participants when opening a multi-student lesson', () => {
		const agreement = mockAgreement({
			teacherProfile: {
				first_name: 'Piet',
				last_name: 'Docent',
				email: 'piet@example.com',
			},
		});
		const agreementsMap = new Map([['agr-1', agreement]]);
		const ui: MockAgendaUI = {
			selectedEvent: mockCalendarEvent({
				resource: {
					...mockCalendarEvent().resource,
					isDuoLesson: true,
					teacherUserId: 'tea-1',
					participants: ['stu-1', 'stu-2'],
					users: [
						{
							user_id: 'stu-1',
							first_name: 'Jan',
							last_name: 'Jansen',
							email: 'jan@example.com',
							avatar_url: null,
							phone_number: null,
						},
						{
							user_id: 'stu-2',
							first_name: 'Anna',
							last_name: 'Bakker',
							email: 'anna@example.com',
							avatar_url: null,
							phone_number: null,
						},
					],
				},
			}),
			editingEvent: { id: 'event-1', source_type: 'lesson_agreement', source_id: 'agr-1' },
		};
		const result = buildState(ui, { agreementsMap });
		expect(result.occurrenceParticipantIds).toEqual(['tea-1', 'stu-1', 'stu-2']);
		expect(result.readonlyParticipantIds).toEqual(['stu-1', 'stu-2', 'tea-1']);
		expect(result.occurrenceParticipantProfiles?.['tea-1']?.first_name).toBe('Piet');
		expect(result.occurrenceParticipantProfiles?.['stu-1']?.first_name).toBe('Jan');
	});

	it('formats occurrence times for deviation events', () => {
		const ui: MockAgendaUI = {
			selectedEvent: mockCalendarEvent({
				resource: {
					...mockCalendarEvent().resource,
					isDeviation: true,
				},
				start: new Date('2026-09-07T14:30:00'),
				end: new Date('2026-09-07T15:30:00'),
			}),
			editingEvent: null,
		};
		const result = buildState(ui);
		expect(result.occurrenceTimes).toEqual({ start: '14:30', end: '15:30' });
	});

	it('resolves the editing agreement from the agreements map', () => {
		const agreement = mockAgreement();
		const agreementsMap = new Map([['agr-1', agreement]]);
		const ui: MockAgendaUI = {
			selectedEvent: null,
			editingEvent: { id: 'event-1', source_type: 'lesson_agreement', source_id: 'agr-1' },
		};
		const result = buildState(ui, { agreementsMap });
		expect(result.editingAgreement).toEqual(agreement);
		expect(result.readonlyParticipantIds).toEqual(['stu-1', 'tea-1']);
	});

	it('builds readonly participant ids with only the student when no teacher is linked', () => {
		const agreement = mockAgreement({ teacherUserId: undefined });
		const agreementsMap = new Map([['agr-1', agreement]]);
		const ui: MockAgendaUI = {
			selectedEvent: null,
			editingEvent: { id: 'event-1', source_type: 'lesson_agreement', source_id: 'agr-1' },
		};
		const result = buildState(ui, { agreementsMap });
		expect(result.readonlyParticipantIds).toEqual(['stu-1']);
	});

	it('allows privileged users to add participants on non-lesson events', () => {
		const ui: MockAgendaUI = {
			selectedEvent: mockCalendarEvent(),
			editingEvent: { id: 'event-1', source_type: 'manual', source_id: null },
		};
		const result = buildState(ui, { isPrivileged: true });
		expect(result.canAddParticipants).toBe(true);
	});

	it('restricts participant editing on lesson agreements to the assigned teacher', () => {
		const agreement = mockAgreement({ teacherUserId: 'tea-1' });
		const agreementsMap = new Map([['agr-1', agreement]]);
		const ui: MockAgendaUI = {
			selectedEvent: mockCalendarEvent(),
			editingEvent: { id: 'event-1', source_type: 'lesson_agreement', source_id: 'agr-1' },
		};
		expect(buildState(ui, { agreementsMap, isPrivileged: true, effectiveUserId: 'tea-1' }).canAddParticipants).toBe(
			true,
		);
		expect(
			buildState(ui, { agreementsMap, isPrivileged: true, effectiveUserId: 'other-user' }).canAddParticipants,
		).toBe(false);
	});

	it('builds deviation info for cancelled or deviated events', () => {
		const ui: MockAgendaUI = {
			selectedEvent: mockCalendarEvent({
				resource: {
					...mockCalendarEvent().resource,
					isDeviation: true,
					isCancelled: true,
					deviationId: 'dev-1',
					originalDate: '2026-09-07',
					originalStartTime: '09:00:00',
					hasTimeOrDateChange: true,
				},
			}),
			editingEvent: null,
		};
		const result = buildState(ui);
		expect(result.deviationInfo).toEqual({
			deviationId: 'dev-1',
			originalDate: '2026-09-07',
			originalStartTime: '09:00:00',
			isCancelled: true,
			hasTimeOrDateChange: true,
			originalSeparateLessonCount: undefined,
		});
	});

	it('includes original separate lesson count for same-slot merges', () => {
		const ui: MockAgendaUI = {
			selectedEvent: mockCalendarEvent({
				resource: {
					...mockCalendarEvent().resource,
					isDeviation: true,
					deviationId: 'dev-1',
					originalDate: '2026-09-07',
					originalStartTime: '09:00:00',
					hasTimeOrDateChange: true,
					isSameSlotMerge: true,
					mergedSlotMembers: [
						{ eventId: 'event-1', originalDate: '2026-09-07' },
						{
							eventId: 'event-2',
							originalDate: '2026-09-07',
							isDeviation: true,
							hasTimeOrDateChange: true,
						},
					],
				},
			}),
			editingEvent: null,
		};
		expect(buildState(ui).deviationInfo?.originalSeparateLessonCount).toBe(2);
	});

	it('returns null deviation info when required original fields are missing', () => {
		const ui: MockAgendaUI = {
			selectedEvent: mockCalendarEvent({
				resource: {
					...mockCalendarEvent().resource,
					isDeviation: true,
					deviationId: 'dev-1',
					originalDate: '2026-09-07',
					originalStartTime: undefined,
				},
			}),
			editingEvent: null,
		};
		expect(buildState(ui).deviationInfo).toBeNull();
	});

	it('prepends teacher from agreement when merged participants omit teacherUserId', () => {
		const agreement = mockAgreement({
			teacherUserId: 'tea-1',
			teacherProfile: {
				first_name: 'Piet',
				last_name: 'Docent',
				email: 'piet@example.com',
			},
		});
		const agreementsMap = new Map([['agr-1', agreement]]);
		const ui: MockAgendaUI = {
			selectedEvent: mockCalendarEvent({
				resource: {
					...mockCalendarEvent().resource,
					isDuoLesson: true,
					participants: ['stu-1', 'stu-2'],
					users: [
						{
							user_id: 'stu-1',
							first_name: 'Jan',
							last_name: 'Jansen',
							email: 'jan@example.com',
							avatar_url: null,
							phone_number: null,
						},
					],
				},
			}),
			editingEvent: { id: 'event-1', source_type: 'lesson_agreement', source_id: 'agr-1' },
		};
		const result = buildState(ui, { agreementsMap });
		expect(result.occurrenceParticipantIds).toEqual(['tea-1', 'stu-1', 'stu-2']);
		expect(result.occurrenceParticipantProfiles?.['tea-1']?.first_name).toBe('Piet');
	});

	it('extracts lesson type display info from the selected event', () => {
		const ui: MockAgendaUI = {
			selectedEvent: mockCalendarEvent({
				resource: {
					...mockCalendarEvent().resource,
					lessonTypeName: 'Gitaar',
					lessonTypeIcon: 'guitar',
					lessonTypeColor: '#ff0000',
				},
			}),
			editingEvent: null,
		};
		const result = buildState(ui);
		expect(result.lessonType).toEqual({ name: 'Gitaar', icon: 'guitar', color: '#ff0000' });
	});
});
