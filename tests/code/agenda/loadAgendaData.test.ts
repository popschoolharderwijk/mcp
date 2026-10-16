import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import type { PostgrestError } from '@supabase/supabase-js';
import type { AgendaEventDeviationRow, AgendaEventRow } from '../../../src/types/agenda-events';
import type { LessonAgreementQuery } from '../../../src/types/lesson-agreements';
import type { User } from '../../../src/types/users';

type TableResult = { data: unknown; error: { message: string; code?: string } | null };

const tableResults: Record<string, TableResult> = {};

function thenableResult(table: string) {
	const result = tableResults[table] ?? { data: [], error: null };
	const promise = Promise.resolve(result);
	return Object.assign(promise, {
		select: () => thenableResult(table),
		eq: () => thenableResult(table),
		in: () => thenableResult(table),
		order: () => thenableResult(table),
		lte: () => thenableResult(table),
	});
}

const supabaseMock = {
	from: (table: string) => thenableResult(table),
};

mock.module('../../../src/integrations/supabase/client', () => ({
	supabase: supabaseMock,
}));

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

function mockPostgrestError(message: string, code = '500'): PostgrestError {
	const error: PostgrestError = {
		message,
		code,
		details: '',
		hint: '',
		name: 'PostgrestError',
		toJSON() {
			return {
				name: this.name,
				message: this.message,
				details: this.details,
				hint: this.hint,
				code: this.code,
			};
		},
	};
	return error;
}

function mockEvent(overrides: Partial<AgendaEventRow> = {}): AgendaEventRow {
	return {
		id: 'event-1',
		title: 'Les',
		description: null,
		color: null,
		start_time: '09:00:00',
		end_time: '10:00:00',
		start_date: '2026-09-01',
		end_date: '2027-07-31',
		is_all_day: false,
		recurring: true,
		recurring_frequency: 'weekly',
		recurring_end_date: '2027-07-31',
		source_type: 'lesson_agreement',
		source_id: 'agr-1',
		owner_user_id: 'user-1',
		created_by: 'user-1',
		updated_by: null,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
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
		actual_start_time: '09:00:00',
		spans_future_occurrences: false,
		spans_end_date: null,
		is_cancelled: false,
		needs_reschedule: false,
		cancellation_type: null,
		cancelled_participant_ids: null,
		title: null,
		description: null,
		color: null,
		participant_ids: ['stu-2'],
		reason: null,
		created_at: '2026-01-01T00:00:00Z',
		created_by: null,
		updated_at: '2026-01-01T00:00:00Z',
		updated_by: null,
		...overrides,
	};
}

function mockAgreement(overrides: Partial<LessonAgreementQuery> = {}): LessonAgreementQuery {
	return {
		id: 'agr-1',
		day_of_week: 1,
		start_time: '09:00:00',
		start_date: '2026-09-01',
		end_date: '2027-07-31',
		is_active: true,
		student_user_id: 'stu-1',
		lesson_type_id: 'lt-1',
		duration_minutes: 60,
		frequency: 'weekly',
		price_per_lesson: 30,
		lesson_types: { id: 'lt-1', name: 'Piano', icon: 'piano', color: '#000000', is_group_lesson: false },
		teachers: [{ user_id: 'tea-1' }],
		...overrides,
	};
}

describe('loadAgendaData pure helpers', () => {
	let loadAgendaData: typeof import('../../../src/lib/agenda/loadAgendaData');

	beforeAll(async () => {
		loadAgendaData = await import('../../../src/lib/agenda/loadAgendaData');
	});

	it('builds participant count and user id maps', () => {
		const participants = [
			{ event_id: 'event-1', user_id: 'stu-1' },
			{ event_id: 'event-1', user_id: 'stu-2' },
			{ event_id: 'event-2', user_id: 'stu-1' },
		];
		const result = loadAgendaData.buildEventParticipantMaps(participants);
		expect(result.countByEventId.get('event-1')).toBe(2);
		expect(result.countByEventId.get('event-2')).toBe(1);
		expect(result.userIdsByEventId.get('event-1')).toEqual(['stu-1', 'stu-2']);
		expect(result.userIdsByEventId.get('event-2')).toEqual(['stu-1']);
	});

	it('extracts unique source ids by type', () => {
		const events = [
			mockEvent({ id: 'event-1', source_type: 'lesson_agreement', source_id: 'agr-1' }),
			mockEvent({ id: 'event-2', source_type: 'lesson_agreement', source_id: 'agr-1' }),
			mockEvent({ id: 'event-3', source_type: 'project', source_id: 'proj-1' }),
			mockEvent({ id: 'event-4', source_type: 'lesson_group', source_id: 'grp-1' }),
			mockEvent({ id: 'event-5', source_type: 'manual', source_id: null }),
		];
		expect(loadAgendaData.extractAgendaEventSourceIds(events)).toEqual({
			lessonAgreementIds: ['agr-1'],
			projectIds: ['proj-1'],
			lessonGroupIds: ['grp-1'],
		});
	});

	it('collects profile user ids from participants, deviations, agreements, and groups', () => {
		const lessonGroupsMap = new Map([
			[
				'grp-1',
				{
					id: 'grp-1',
					name: 'Groep A',
					lessonTypeName: 'Piano',
					lessonTypeIcon: null,
					lessonTypeColor: null,
					memberUserIds: ['stu-3'],
				},
			],
		]);
		const userIds = loadAgendaData.collectAgendaProfileUserIds({
			participants: [
				{ event_id: 'event-1', user_id: 'stu-1' },
				{ event_id: 'event-1', user_id: 'stu-2' },
			],
			deviations: [mockDeviation({ participant_ids: ['stu-2', 'stu-4'] })],
			agreements: [mockAgreement()],
			agreementsError: null,
			lessonGroupsMap,
		});
		expect([...userIds].sort()).toEqual(['stu-1', 'stu-2', 'stu-3', 'stu-4', 'tea-1']);
	});

	it('returns an empty profile id list when agreements failed to load', () => {
		const userIds = loadAgendaData.collectAgendaProfileUserIds({
			participants: [{ event_id: 'event-1', user_id: 'stu-1' }],
			deviations: [],
			agreements: [mockAgreement()],
			agreementsError: mockPostgrestError('db error'),
			lessonGroupsMap: new Map(),
		});
		expect(userIds).toEqual(['stu-1']);
	});

	it('builds participant names only for events with multiple participants', () => {
		const profileMap = new Map([
			['stu-1', studentProfile],
			['stu-2', { ...studentProfile, user_id: 'stu-2', first_name: 'Anna', last_name: 'Bakker' }],
		]);
		const userIdsByEventId = new Map([
			['event-1', ['stu-1', 'stu-2']],
			['event-2', ['stu-1']],
		]);
		const namesByEventId = loadAgendaData.buildParticipantNamesByEventId(profileMap, userIdsByEventId);
		expect(namesByEventId.get('event-1')).toEqual(['Anna Bakker', 'Jan Jansen']);
		expect(namesByEventId.has('event-2')).toBe(false);
	});

	it('builds deviation participant maps with sorted names', () => {
		const profileMap = new Map([
			['stu-1', studentProfile],
			['stu-2', { ...studentProfile, user_id: 'stu-2', first_name: 'Anna', last_name: 'Bakker' }],
		]);
		const result = loadAgendaData.buildDeviationParticipantMaps(
			[mockDeviation({ id: 'dev-1', participant_ids: ['stu-2', 'stu-1'] })],
			profileMap,
		);
		expect(result.countByDeviationId.get('dev-1')).toBe(2);
		expect(result.namesByDeviationId.get('dev-1')).toEqual(['Anna Bakker', 'Jan Jansen']);
	});

	it('builds agreements with student and teacher profiles', () => {
		const profileMap = new Map([
			['stu-1', studentProfile],
			['tea-1', teacherProfile],
		]);
		const result = loadAgendaData.buildAgendaAgreementsWithProfiles([mockAgreement()], null, profileMap);
		const objectJoinResult = loadAgendaData.buildAgendaAgreementsWithProfiles(
			[mockAgreement({ teachers: { user_id: 'tea-1' } })],
			null,
			profileMap,
		);
		expect(objectJoinResult[0]?.teacherUserId).toBe('tea-1');
		expect(objectJoinResult[0]?.teacherProfile).toEqual(teacherProfile);
		expect(result).toHaveLength(1);
		expect(result[0]?.teacherUserId).toBe('tea-1');
		expect(result[0]?.profiles).toEqual(studentProfile);
		expect(result[0]?.teacherProfile).toEqual(teacherProfile);
	});

	it('returns an empty agreement list when loading agreements failed', () => {
		const result = loadAgendaData.buildAgendaAgreementsWithProfiles(
			[mockAgreement()],
			mockPostgrestError('db error'),
			new Map(),
		);
		expect(result).toEqual([]);
	});

	it('returns an empty agreement list when no agreements are provided', () => {
		const result = loadAgendaData.buildAgendaAgreementsWithProfiles([], null, new Map());
		expect(result).toEqual([]);
	});

	it('normalizes array lesson type rows and missing teacher profiles', () => {
		const profileMap = new Map([['stu-1', studentProfile]]);
		const result = loadAgendaData.buildAgendaAgreementsWithProfiles(
			[
				mockAgreement({
					teachers: [],
					lesson_types: [{ id: 'lt-2', name: 'Gitaar', icon: '', color: '', is_group_lesson: true }],
				}),
			],
			null,
			profileMap,
		);
		expect(result).toHaveLength(1);
		expect(result[0]?.teacherUserId).toBeUndefined();
		expect(result[0]?.teacherProfile).toBeNull();
		expect(result[0]?.lesson_types).toEqual({
			id: 'lt-2',
			name: 'Gitaar',
			icon: '',
			color: '',
			is_group_lesson: true,
		});
	});
});

describe('loadAgendaData fetch helpers', () => {
	let loadAgendaData: typeof import('../../../src/lib/agenda/loadAgendaData');

	beforeAll(async () => {
		loadAgendaData = await import('../../../src/lib/agenda/loadAgendaData');
	});

	beforeEach(() => {
		for (const key of Object.keys(tableResults)) {
			delete tableResults[key];
		}
	});

	it('fetches no-lesson periods', async () => {
		tableResults.no_lesson_periods = {
			data: [{ start_date: '2026-07-01', end_date: '2026-08-31', name: 'Zomervakantie' }],
			error: null,
		};
		const result = await loadAgendaData.fetchNoLessonPeriods();
		expect(result).toEqual([{ start_date: '2026-07-01', end_date: '2026-08-31', name: 'Zomervakantie' }]);
	});

	it('returns empty participant event ids when the user has no participations', async () => {
		tableResults.agenda_participants = { data: [], error: null };
		expect(await loadAgendaData.fetchUserParticipantEventIds('user-1')).toEqual({ status: 'empty' });
	});

	it('returns participant event ids for a user', async () => {
		tableResults.agenda_participants = {
			data: [{ event_id: 'event-1' }, { event_id: 'event-1' }, { event_id: 'event-2' }],
			error: null,
		};
		expect(await loadAgendaData.fetchUserParticipantEventIds('user-1')).toEqual({
			status: 'ok',
			eventIds: ['event-1', 'event-2'],
		});
	});

	it('returns error status when participant lookup fails', async () => {
		tableResults.agenda_participants = { data: null, error: { message: 'db error' } };
		expect(await loadAgendaData.fetchUserParticipantEventIds('user-1')).toEqual({ status: 'error' });
	});

	it('loads core agenda data for event ids', async () => {
		tableResults.agenda_events = { data: [mockEvent()], error: null };
		tableResults.agenda_event_deviations = { data: [mockDeviation()], error: null };
		tableResults.agenda_participants = {
			data: [{ event_id: 'event-1', user_id: 'stu-1' }],
			error: null,
		};
		const result = await loadAgendaData.fetchAgendaCoreData(['event-1']);
		expect(result).toEqual({
			status: 'ok',
			data: {
				events: [mockEvent()],
				deviations: [mockDeviation()],
				participants: [{ event_id: 'event-1', user_id: 'stu-1' }],
			},
		});
	});

	it('returns events_error when event loading fails', async () => {
		tableResults.agenda_events = { data: null, error: { message: 'db error' } };
		tableResults.agenda_event_deviations = { data: [], error: null };
		tableResults.agenda_participants = { data: [], error: null };
		expect(await loadAgendaData.fetchAgendaCoreData(['event-1'])).toEqual({ status: 'events_error' });
	});

	it('returns deviations_error when deviation loading fails', async () => {
		tableResults.agenda_events = { data: [mockEvent()], error: null };
		tableResults.agenda_event_deviations = { data: null, error: { message: 'db error' } };
		tableResults.agenda_participants = { data: [], error: null };
		expect(await loadAgendaData.fetchAgendaCoreData(['event-1'])).toEqual({ status: 'deviations_error' });
	});

	it('returns agreements error from related data fetch', async () => {
		tableResults.lesson_agreements = { data: null, error: { message: 'agr error', code: '500' } };
		const result = await loadAgendaData.fetchAgendaRelatedData({
			lessonAgreementIds: ['agr-1'],
			projectIds: [],
			lessonGroupIds: [],
		});
		expect(result.agreements).toEqual([]);
		expect(result.agreementsError?.message).toBe('agr error');
	});

	it('loads related agreements, projects, and lesson groups', async () => {
		tableResults.lesson_agreements = { data: [mockAgreement()], error: null };
		tableResults.projects = { data: [{ id: 'proj-1', name: 'Project A' }], error: null };
		tableResults.lesson_groups = {
			data: [
				{
					id: 'grp-1',
					name: 'Groep A',
					lesson_types: { id: 'lt-1', name: 'Piano', icon: 'piano', color: '#000000' },
					lesson_group_members: [
						{ student_user_id: 'stu-1', left_date: null },
						{ student_user_id: 'stu-2', left_date: '2026-01-01' },
					],
				},
			],
			error: null,
		};
		const result = await loadAgendaData.fetchAgendaRelatedData({
			lessonAgreementIds: ['agr-1'],
			projectIds: ['proj-1'],
			lessonGroupIds: ['grp-1'],
		});
		expect(result.agreements).toHaveLength(1);
		expect(result.agreementsError).toBeNull();
		expect(result.projectsMap.get('proj-1')).toEqual({ id: 'proj-1', name: 'Project A' });
		expect(result.lessonGroupsMap.get('grp-1')).toEqual({
			id: 'grp-1',
			name: 'Groep A',
			lessonTypeName: 'Piano',
			lessonTypeIcon: 'piano',
			lessonTypeColor: '#000000',
			memberUserIds: ['stu-1'],
		});
	});

	it('loads profiles into a map keyed by user id', async () => {
		tableResults.profiles = { data: [studentProfile, teacherProfile], error: null };
		const result = await loadAgendaData.fetchAgendaProfiles(['stu-1', 'tea-1']);
		expect(result.get('stu-1')).toEqual(studentProfile);
		expect(result.get('tea-1')).toEqual(teacherProfile);
	});

	it('returns an empty profile map for an empty user id list', async () => {
		const result = await loadAgendaData.fetchAgendaProfiles([]);
		expect(result.size).toBe(0);
	});

	it('returns empty related data when no source ids are provided', async () => {
		const result = await loadAgendaData.fetchAgendaRelatedData({
			lessonAgreementIds: [],
			projectIds: [],
			lessonGroupIds: [],
		});
		expect(result.agreements).toEqual([]);
		expect(result.agreementsError).toBeNull();
		expect(result.projectsMap.size).toBe(0);
		expect(result.lessonGroupsMap.size).toBe(0);
	});

	it('normalizes array lesson type rows in lesson groups', async () => {
		tableResults.lesson_groups = {
			data: [
				{
					id: 'grp-2',
					name: 'Groep B',
					lesson_types: [{ id: 'lt-2', name: 'Gitaar', icon: 'guitar', color: '#ff0000' }],
					lesson_group_members: [{ student_user_id: 'stu-3', left_date: null }],
				},
			],
			error: null,
		};
		const result = await loadAgendaData.fetchAgendaRelatedData({
			lessonAgreementIds: [],
			projectIds: [],
			lessonGroupIds: ['grp-2'],
		});
		expect(result.lessonGroupsMap.get('grp-2')).toEqual({
			id: 'grp-2',
			name: 'Groep B',
			lessonTypeName: 'Gitaar',
			lessonTypeIcon: 'guitar',
			lessonTypeColor: '#ff0000',
			memberUserIds: ['stu-3'],
		});
	});
});
