import type { CalendarEvent } from '@/components/agenda/types';
import type { AgendaLessonAgreement } from '@/types/lesson-agreements';
import type { User } from '@/types/users';

export type OccurrenceParticipantProfile = {
	first_name: string | null;
	last_name: string | null;
	email: string | null;
};

function profileFromUser(user: Pick<User, 'first_name' | 'last_name' | 'email'>): OccurrenceParticipantProfile {
	return {
		first_name: user.first_name,
		last_name: user.last_name,
		email: user.email,
	};
}

function withTeacherParticipant(participantIds: string[], teacherUserId: string | undefined): string[] {
	if (!teacherUserId || participantIds.includes(teacherUserId)) return participantIds;
	return [teacherUserId, ...participantIds];
}

export function resolveOccurrenceParticipantIds(
	deviationParticipantIds: string[] | null | undefined,
	selectedEvent: CalendarEvent | null,
	editingAgreement: AgendaLessonAgreement | undefined,
): string[] | null {
	if (deviationParticipantIds && deviationParticipantIds.length > 0) {
		return deviationParticipantIds;
	}
	const mergedParticipants = selectedEvent?.resource.participants;
	if (!selectedEvent?.resource.isDuoLesson || !mergedParticipants?.length) {
		return null;
	}
	const teacherUserId = selectedEvent.resource.teacherUserId ?? editingAgreement?.teacherUserId;
	return withTeacherParticipant(mergedParticipants, teacherUserId);
}

export function buildOccurrenceParticipantProfiles(
	selectedEvent: CalendarEvent | null,
	editingAgreement: AgendaLessonAgreement | undefined,
	occurrenceParticipantIds: string[] | null,
): Record<string, OccurrenceParticipantProfile> | null {
	if (!occurrenceParticipantIds?.length || !selectedEvent?.resource.isDuoLesson) return null;

	const profiles: Record<string, OccurrenceParticipantProfile> = {};
	for (const user of selectedEvent.resource.users ?? []) {
		profiles[user.user_id] = profileFromUser(user);
	}
	if (selectedEvent.resource.user) {
		profiles[selectedEvent.resource.user.user_id] = profileFromUser(selectedEvent.resource.user);
	}

	const teacherUserId = selectedEvent.resource.teacherUserId ?? editingAgreement?.teacherUserId;
	const teacherProfile = editingAgreement?.teacherProfile;
	if (teacherUserId && teacherProfile) {
		profiles[teacherUserId] = {
			first_name: teacherProfile.first_name ?? null,
			last_name: teacherProfile.last_name ?? null,
			email: teacherProfile.email ?? null,
		};
	}

	return Object.keys(profiles).length > 0 ? profiles : null;
}

export function resolveOriginalSeparateLessonCount(resource: CalendarEvent['resource']): number | undefined {
	const mergedCount = resource.mergedSlotMembers?.length;
	if (!resource.isSameSlotMerge || !mergedCount || mergedCount <= 1) return undefined;
	return mergedCount;
}
