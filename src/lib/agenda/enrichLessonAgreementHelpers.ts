import type { EnrichAgendaEventContext } from '@/lib/agenda/enrichAgendaEventContext';
import { buildParticipantInfo } from '@/lib/agenda/eventUtils';
import { getDisplayName, getFirstName, joinFirstNames } from '@/lib/display-name';
import type { AgendaLessonAgreement } from '@/types/lesson-agreements';
import type { UserOptional } from '@/types/users';

export interface LessonAgreementStudentInfo {
	isDuo: boolean;
	studentName: string;
	studentUsers: NonNullable<ReturnType<typeof buildParticipantInfo>>[];
	user: ReturnType<typeof buildParticipantInfo> | undefined;
}

export function buildLessonAgreementStudentInfo(
	agreement: AgendaLessonAgreement,
	eventId: string | undefined,
	teacherUid: string | undefined,
	ctx: EnrichAgendaEventContext,
): LessonAgreementStudentInfo {
	const allParticipantIds = eventId ? (ctx.participantUserIdsByEventId.get(eventId) ?? []) : [];
	const studentParticipantIds = allParticipantIds.filter((uid) => uid !== teacherUid);
	const isDuo = studentParticipantIds.length > 1;

	const studentUsers = isDuo
		? studentParticipantIds
				.map((uid) => buildParticipantInfo(ctx.profileMap.get(uid) ?? null, uid))
				.filter((user): user is NonNullable<typeof user> => !!user)
		: [];

	const studentName = isDuo
		? studentParticipantIds
				.map((uid) => getDisplayName(ctx.profileMap.get(uid) ?? null))
				.sort()
				.join(' & ')
		: getDisplayName(agreement.profiles);

	const user = isDuo ? undefined : buildParticipantInfo(agreement.profiles, agreement.student_user_id);

	return { isDuo, studentName, studentUsers, user };
}

export function buildLessonAgreementTeacherName(teacherProfile: UserOptional | null | undefined): string {
	return teacherProfile ? getDisplayName(teacherProfile) : 'Docent onbekend';
}

/** Party names for the calendar title: omit the viewer (teacher → students; student → teacher [+ other duo students]). */
export function buildLessonAgreementTitlePartyName(params: {
	studentInfo: LessonAgreementStudentInfo;
	teacherName: string;
	teacherUserId: string | undefined;
	viewerUserId: string | undefined;
}): string {
	const { studentInfo, teacherName, teacherUserId, viewerUserId } = params;

	if (!viewerUserId || viewerUserId === teacherUserId) {
		if (studentInfo.isDuo) {
			return joinFirstNames(studentInfo.studentUsers);
		}
		return studentInfo.studentName;
	}

	if (!studentInfo.isDuo) {
		return teacherName;
	}

	const otherStudentFirstNames = studentInfo.studentUsers
		.filter((user) => user.user_id !== viewerUserId)
		.map((user) => getFirstName(user))
		.sort((left, right) => left.localeCompare(right, 'nl'));
	return [teacherName, ...otherStudentFirstNames].join(' & ');
}
