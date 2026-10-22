export function buildTrialParticipantRows(eventId: string, teacherUserId: string, studentUserId: string) {
	return [
		{ event_id: eventId, user_id: teacherUserId },
		{ event_id: eventId, user_id: studentUserId },
	];
}

export function buildTrialScheduleSuccessResult(trialId: string, agendaEventId: string, lessonTypeName: string) {
	return { trialId, agendaEventId, lessonTypeName };
}

export function resolveLessonTypeName(name: string | null | undefined): string {
	return name ?? '';
}

export function resolveTrialLessonTypeMeta(lessonType: { name: string | null; color: string | null } | null): {
	lessonTypeName: string;
	lessonTypeColor: string | null;
} {
	return {
		lessonTypeName: resolveLessonTypeName(lessonType?.name),
		lessonTypeColor: lessonType?.color ?? null,
	};
}
