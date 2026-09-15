import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { LessonGroupInfo } from '@/lib/agenda/enrichAgendaEventContext';
import type { NoLessonPeriod } from '@/lib/agenda/noLessonPeriod';
import { pushToMapArray } from '@/lib/collections';
import { getDisplayName } from '@/lib/display-name';
import type { AgendaEventDeviationRow, AgendaEventRow } from '@/types/agenda-events';
import type { AgendaLessonAgreement, LessonAgreementQuery } from '@/types/lesson-agreements';
import type { ProjectInfo } from '@/types/projects';
import type { User } from '@/types/users';

const LESSON_AGREEMENT_SELECT =
	'id, day_of_week, start_time, start_date, end_date, is_active, student_user_id, lesson_type_id, duration_minutes, frequency, price_per_lesson, lesson_types(id, name, icon, color, is_group_lesson), teachers(user_id)';

const PROFILE_SELECT = 'user_id, first_name, last_name, email, avatar_url, phone_number';

const LESSON_GROUP_SELECT =
	'id, name, lesson_types(id, name, icon, color), lesson_group_members(student_user_id, left_date)';

type AgendaParticipantRow = { event_id: string; user_id: string };

type LessonGroupQueryRow = {
	id: string;
	name: string;
	lesson_types:
		| { id: string; name: string; icon: string | null; color: string | null }
		| { id: string; name: string; icon: string | null; color: string | null }[]
		| null;
	lesson_group_members: { student_user_id: string; left_date: string | null }[] | null;
};

export interface AgendaCoreData {
	events: AgendaEventRow[];
	deviations: AgendaEventDeviationRow[];
	participants: AgendaParticipantRow[];
}

export interface EventParticipantMaps {
	countByEventId: Map<string, number>;
	userIdsByEventId: Map<string, string[]>;
}

export interface DeviationParticipantMaps {
	countByDeviationId: Map<string, number>;
	namesByDeviationId: Map<string, string[]>;
}

export interface AgendaEventSourceIds {
	lessonAgreementIds: string[];
	projectIds: string[];
	lessonGroupIds: string[];
}

export interface AgendaRelatedData {
	agreements: LessonAgreementQuery[];
	agreementsError: PostgrestError | null;
	projectsMap: Map<string, ProjectInfo>;
	lessonGroupsMap: Map<string, LessonGroupInfo>;
}

export type UserParticipantEventIdsResult =
	| { status: 'ok'; eventIds: string[] }
	| { status: 'empty' }
	| { status: 'error' };

export type AgendaCoreDataResult =
	| { status: 'ok'; data: AgendaCoreData }
	| { status: 'events_error' }
	| { status: 'deviations_error' };

function getTeacherUserId(teachers: { user_id: string }[] | null | undefined): string | undefined {
	return teachers?.[0]?.user_id;
}

function normalizeLessonType(lt: LessonAgreementQuery['lesson_types']): {
	id: string;
	name: string;
	icon: string;
	color: string;
	is_group_lesson: boolean;
} | null {
	if (!lt) return null;
	const row = Array.isArray(lt) ? (lt[0] ?? null) : lt;
	if (!row) return null;
	return {
		id: row.id,
		name: row.name,
		icon: row.icon ?? '',
		color: row.color ?? '',
		is_group_lesson: row.is_group_lesson ?? false,
	};
}

function extractSourceIds(events: AgendaEventRow[], sourceType: AgendaEventRow['source_type']): string[] {
	return [
		...new Set(
			events
				.filter(
					(e): e is AgendaEventRow & { source_id: string } =>
						e.source_type === sourceType && e.source_id != null,
				)
				.map((e) => e.source_id),
		),
	];
}

export async function fetchNoLessonPeriods(): Promise<NoLessonPeriod[]> {
	const { data } = await supabase.from('no_lesson_periods').select('start_date, end_date, name');
	return data ?? [];
}

export async function fetchUserParticipantEventIds(userId: string): Promise<UserParticipantEventIdsResult> {
	const { data: participantRows, error } = await supabase
		.from('agenda_participants')
		.select('event_id')
		.eq('user_id', userId);

	if (error) return { status: 'error' };
	if (!participantRows?.length) return { status: 'empty' };

	return { status: 'ok', eventIds: [...new Set(participantRows.map((p) => p.event_id))] };
}

export async function fetchAgendaCoreData(eventIds: string[]): Promise<AgendaCoreDataResult> {
	const [eventsResult, deviationsResult, participantsResult] = await Promise.all([
		supabase.from('agenda_events').select('*').in('id', eventIds),
		supabase.from('agenda_event_deviations').select('*').in('event_id', eventIds),
		supabase.from('agenda_participants').select('event_id, user_id').in('event_id', eventIds),
	]);

	if (eventsResult.error) return { status: 'events_error' };
	if (deviationsResult.error) return { status: 'deviations_error' };

	return {
		status: 'ok',
		data: {
			events: eventsResult.data ?? [],
			deviations: deviationsResult.data ?? [],
			participants: participantsResult.data ?? [],
		},
	};
}

export function buildEventParticipantMaps(participants: AgendaParticipantRow[]): EventParticipantMaps {
	const countByEventId = new Map<string, number>();
	const userIdsByEventId = new Map<string, string[]>();

	for (const participant of participants) {
		countByEventId.set(participant.event_id, (countByEventId.get(participant.event_id) ?? 0) + 1);
		pushToMapArray(userIdsByEventId, participant.event_id, participant.user_id);
	}

	return { countByEventId, userIdsByEventId };
}

export function extractAgendaEventSourceIds(events: AgendaEventRow[]): AgendaEventSourceIds {
	return {
		lessonAgreementIds: extractSourceIds(events, 'lesson_agreement'),
		projectIds: extractSourceIds(events, 'project'),
		lessonGroupIds: extractSourceIds(events, 'lesson_group'),
	};
}

async function fetchLessonAgreements(ids: string[]): Promise<{
	data: LessonAgreementQuery[];
	error: PostgrestError | null;
}> {
	if (ids.length === 0) return { data: [], error: null };

	const { data, error } = await supabase
		.from('lesson_agreements')
		.select(LESSON_AGREEMENT_SELECT)
		.in('id', ids)
		.eq('is_active', true);

	return { data: (data ?? []) as unknown as LessonAgreementQuery[], error };
}

async function fetchProjects(ids: string[]): Promise<ProjectInfo[]> {
	if (ids.length === 0) return [];

	const { data } = await supabase.from('projects').select('id, name').in('id', ids);
	return data ?? [];
}

async function fetchLessonGroups(ids: string[]): Promise<LessonGroupQueryRow[]> {
	if (ids.length === 0) return [];

	const { data } = await supabase.from('lesson_groups').select(LESSON_GROUP_SELECT).in('id', ids);
	return (data ?? []) as LessonGroupQueryRow[];
}

function lessonTypeFromGroupRow(group: LessonGroupQueryRow) {
	return Array.isArray(group.lesson_types) ? group.lesson_types[0] : group.lesson_types;
}

function activeLessonGroupMemberUserIds(group: LessonGroupQueryRow): string[] {
	return (group.lesson_group_members ?? [])
		.filter((member) => member.left_date === null)
		.map((member) => member.student_user_id);
}

function buildLessonGroupsMap(rows: LessonGroupQueryRow[]): Map<string, LessonGroupInfo> {
	const lessonGroupsMap = new Map<string, LessonGroupInfo>();

	for (const group of rows) {
		const lessonType = lessonTypeFromGroupRow(group);
		lessonGroupsMap.set(group.id, {
			id: group.id,
			name: group.name,
			lessonTypeName: lessonType?.name ?? null,
			lessonTypeIcon: lessonType?.icon ?? null,
			lessonTypeColor: lessonType?.color ?? null,
			memberUserIds: activeLessonGroupMemberUserIds(group),
		});
	}

	return lessonGroupsMap;
}

export async function fetchAgendaRelatedData(sourceIds: AgendaEventSourceIds): Promise<AgendaRelatedData> {
	const [agreementsResult, projects, lessonGroupRows] = await Promise.all([
		fetchLessonAgreements(sourceIds.lessonAgreementIds),
		fetchProjects(sourceIds.projectIds),
		fetchLessonGroups(sourceIds.lessonGroupIds),
	]);

	return {
		agreements: agreementsResult.data,
		agreementsError: agreementsResult.error,
		projectsMap: new Map(projects.map((project) => [project.id, project])),
		lessonGroupsMap: buildLessonGroupsMap(lessonGroupRows),
	};
}

function collectAgreementProfileIds(
	agreements: LessonAgreementQuery[],
	agreementsError: PostgrestError | null,
): {
	studentUserIds: string[];
	teacherUserIds: string[];
} {
	if (agreementsError || agreements.length === 0) {
		return { studentUserIds: [], teacherUserIds: [] };
	}

	const studentUserIds = [...new Set(agreements.map((agreement) => agreement.student_user_id))];
	const teacherUserIds = [
		...new Set(
			agreements
				.map((agreement) => getTeacherUserId(agreement.teachers))
				.filter((id): id is string => id !== undefined),
		),
	];

	return { studentUserIds, teacherUserIds };
}

export function collectAgendaProfileUserIds(params: {
	participants: AgendaParticipantRow[];
	deviations: AgendaEventDeviationRow[];
	agreements: LessonAgreementQuery[];
	agreementsError: PostgrestError | null;
	lessonGroupsMap: Map<string, LessonGroupInfo>;
}): string[] {
	const deviationUserIds = [...new Set(params.deviations.flatMap((deviation) => deviation.participant_ids ?? []))];
	const { studentUserIds, teacherUserIds } = collectAgreementProfileIds(params.agreements, params.agreementsError);
	const groupMemberIds = [...new Set([...params.lessonGroupsMap.values()].flatMap((group) => group.memberUserIds))];

	return [
		...new Set([
			...params.participants.map((participant) => participant.user_id),
			...deviationUserIds,
			...studentUserIds,
			...teacherUserIds,
			...groupMemberIds,
		]),
	];
}

export async function fetchAgendaProfiles(userIds: string[]): Promise<Map<string, User>> {
	if (userIds.length === 0) return new Map();

	const { data } = await supabase.from('profiles').select(PROFILE_SELECT).in('user_id', userIds);
	const profiles = data ?? [];
	return new Map(profiles.map((profile) => [profile.user_id, profile]));
}

export function buildParticipantNamesByEventId(
	profileMap: Map<string, User>,
	userIdsByEventId: Map<string, string[]>,
): Map<string, string[]> {
	const namesByEventId = new Map<string, string[]>();

	for (const [eventId, userIds] of userIdsByEventId) {
		if (userIds.length <= 1) continue;
		const names = userIds.map((userId) => getDisplayName(profileMap.get(userId))).sort();
		namesByEventId.set(eventId, names);
	}

	return namesByEventId;
}

export function buildDeviationParticipantMaps(
	deviations: AgendaEventDeviationRow[],
	profileMap: Map<string, User>,
): DeviationParticipantMaps {
	const countByDeviationId = new Map<string, number>();
	const namesByDeviationId = new Map<string, string[]>();

	for (const deviation of deviations) {
		const participantIds = deviation.participant_ids;
		if (!participantIds?.length) continue;

		countByDeviationId.set(deviation.id, participantIds.length);
		const names = participantIds.map((userId) => getDisplayName(profileMap.get(userId))).sort();
		namesByDeviationId.set(deviation.id, names);
	}

	return { countByDeviationId, namesByDeviationId };
}

function mapAgendaAgreementWithProfiles(
	agreement: LessonAgreementQuery,
	profileMap: Map<string, User>,
): AgendaLessonAgreement {
	const teacherUserId = getTeacherUserId(agreement.teachers);
	const lessonType = normalizeLessonType(agreement.lesson_types);

	return {
		...agreement,
		profiles: profileMap.get(agreement.student_user_id) ?? null,
		lesson_types: lessonType ?? {
			id: '',
			name: '',
			icon: '',
			color: '',
			is_group_lesson: false,
		},
		teacherUserId,
		teacherProfile: teacherUserId ? (profileMap.get(teacherUserId) ?? null) : null,
	} satisfies AgendaLessonAgreement;
}

export function buildAgendaAgreementsWithProfiles(
	agreements: LessonAgreementQuery[],
	agreementsError: PostgrestError | null,
	profileMap: Map<string, User>,
): AgendaLessonAgreement[] {
	if (agreementsError || agreements.length === 0) return [];

	const result: AgendaLessonAgreement[] = [];
	for (const agreement of agreements) {
		result.push(mapAgendaAgreementWithProfiles(agreement, profileMap));
	}
	return result;
}
