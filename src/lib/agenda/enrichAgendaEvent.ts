import type { CalendarEvent } from '@/components/agenda/types';
import {
	buildLessonAgreementStudentInfo,
	buildLessonAgreementTeacherName,
	type LessonAgreementStudentInfo,
} from '@/lib/agenda/enrichLessonAgreementHelpers';
import { getDisplayName } from '@/lib/display-name';
import type { User } from '@/types/users';
import type { EnrichAgendaEventContext } from './enrichAgendaEventContext';

function withParticipants(ev: CalendarEvent, ctx: EnrichAgendaEventContext): CalendarEvent {
	const deviationId = ev.resource.deviationId;
	const hasDeviationParticipants =
		deviationId &&
		(ctx.participantCountByDeviationId.has(deviationId) || ctx.participantNamesByDeviationId.has(deviationId));

	const participantCount =
		hasDeviationParticipants && deviationId
			? ctx.participantCountByDeviationId.get(deviationId)
			: ev.resource.eventId
				? ctx.participantCountByEventId.get(ev.resource.eventId)
				: undefined;
	const participantNames =
		hasDeviationParticipants && deviationId
			? ctx.participantNamesByDeviationId.get(deviationId)
			: ev.resource.eventId
				? ctx.participantNamesByEventId.get(ev.resource.eventId)
				: undefined;

	return {
		...ev,
		resource: { ...ev.resource, participantCount, participantNames },
	};
}

function enrichProjectAgendaEvent(ev: CalendarEvent, ctx: EnrichAgendaEventContext): CalendarEvent | null {
	if (ev.resource.sourceType !== 'project' || !ev.resource.agreementId) return null;
	const project = ctx.projectsMap.get(ev.resource.agreementId);
	if (!project) return null;
	const appointmentTitle = (typeof ev.title === 'string' ? ev.title : '').trim();
	const displayTitle = appointmentTitle ? `${project.name} - ${appointmentTitle}` : project.name;
	return {
		...ev,
		title: displayTitle,
		resource: {
			...ev.resource,
			projectId: project.id,
			projectName: project.name,
			lessonTypeName: project.name,
			studentName: project.name,
		},
	};
}

function resolveLessonGroupOccurrenceTitle(name: string, count: number): string {
	return count > 0 ? `${name} (${count})` : name;
}

function findLessonGroupOccurrenceDeviation(
	ev: CalendarEvent,
	ctx: EnrichAgendaEventContext,
): { cancelled_participant_ids?: string[] | null } | undefined {
	if (!ev.resource.eventId || !ev.resource.originalDate) return undefined;
	return ctx.deviationsByEventId.get(ev.resource.eventId)?.get(ev.resource.originalDate);
}

function resolveLessonGroupMemberUsers(
	memberUserIds: string[],
	profileMap: EnrichAgendaEventContext['profileMap'],
): User[] {
	return memberUserIds.map((uid) => profileMap.get(uid)).filter((p): p is User => !!p);
}

function resolveLessonGroupCount(users: User[], participantCount: number | undefined): number {
	return users.length || (participantCount ?? 0);
}

function resolveLessonGroupStudentName(users: User[], fallback: string): string {
	return users.map((u) => getDisplayName(u)).join(', ') || fallback;
}

function enrichLessonGroupAgendaEvent(ev: CalendarEvent, ctx: EnrichAgendaEventContext): CalendarEvent | null {
	if (ev.resource.sourceType !== 'lesson_group' || !ev.resource.agreementId) return null;
	const group = ctx.lessonGroupsMap.get(ev.resource.agreementId);
	if (!group) return null;
	const users = resolveLessonGroupMemberUsers(group.memberUserIds, ctx.profileMap);
	const count = resolveLessonGroupCount(users, ev.resource.participantCount);
	const deviation = findLessonGroupOccurrenceDeviation(ev, ctx);

	return {
		...ev,
		title: resolveLessonGroupOccurrenceTitle(group.name, count),
		resource: {
			...ev.resource,
			lessonGroupId: group.id,
			lessonGroupName: group.name,
			lessonTypeName: group.lessonTypeName ?? group.name,
			lessonTypeColor: ev.resource.color ?? group.lessonTypeColor,
			lessonTypeIcon: group.lessonTypeIcon,
			studentName: resolveLessonGroupStudentName(users, group.name),
			isGroupLesson: true,
			studentCount: count,
			users,
			isLesson: true,
			cancelledParticipantIds: deviation?.cancelled_participant_ids ?? undefined,
		},
	};
}

function resolveLessonAgreementStudentCount(
	studentInfo: LessonAgreementStudentInfo,
	isGroupLesson: boolean | null | undefined,
): number | undefined {
	if (studentInfo.isDuo) return studentInfo.studentUsers.length;
	if (isGroupLesson) return 1;
	return undefined;
}

function resolveLessonAgreementUsers(studentInfo: LessonAgreementStudentInfo) {
	if (studentInfo.isDuo) return studentInfo.studentUsers;
	return studentInfo.user ? [studentInfo.user] : undefined;
}

function enrichLessonAgreementAgendaEvent(ev: CalendarEvent, ctx: EnrichAgendaEventContext): CalendarEvent | null {
	if (ev.resource.sourceType !== 'lesson_agreement' || !ev.resource.agreementId) return null;
	const agreement = ctx.agreementsMap.get(ev.resource.agreementId);
	if (!agreement) return null;

	const studentInfo = buildLessonAgreementStudentInfo(agreement, ev.resource.eventId, agreement.teacherUserId, ctx);
	const teacherName = buildLessonAgreementTeacherName(agreement.teacherProfile);
	const isGroupLesson = agreement.lesson_types.is_group_lesson ?? false;

	return {
		...ev,
		title: `${studentInfo.studentName} - ${agreement.lesson_types.name}`,
		resource: {
			...ev.resource,
			studentName: studentInfo.studentName,
			teacherName,
			viewerIsTeacher: ctx.viewerUserId === agreement.teacherUserId,
			lessonTypeName: agreement.lesson_types.name,
			lessonTypeColor: agreement.lesson_types.color,
			lessonTypeIcon: agreement.lesson_types.icon,
			isGroupLesson,
			isDuoLesson: studentInfo.isDuo,
			studentCount: resolveLessonAgreementStudentCount(studentInfo, isGroupLesson),
			user: studentInfo.user ?? undefined,
			users: resolveLessonAgreementUsers(studentInfo),
			isLesson: true,
		},
	};
}

export function enrichAgendaEvent(ev: CalendarEvent, ctx: EnrichAgendaEventContext): CalendarEvent {
	const enriched = withParticipants(ev, ctx);
	return (
		enrichProjectAgendaEvent(enriched, ctx) ??
		enrichLessonGroupAgendaEvent(enriched, ctx) ??
		enrichLessonAgreementAgendaEvent(enriched, ctx) ??
		enriched
	);
}

export type { EnrichAgendaEventContext, LessonGroupInfo } from './enrichAgendaEventContext';
