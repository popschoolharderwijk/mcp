export function classifyCourseFlags(
	name: string,
	maxParticipants: number | null,
): {
	isDuoLesson: boolean;
	isGroupLesson: boolean;
} {
	const isDuoLesson = /\bDUO\b/i.test(name);
	if (isDuoLesson) {
		return { isDuoLesson: true, isGroupLesson: false };
	}
	if (maxParticipants != null && maxParticipants > 1) {
		return { isDuoLesson: false, isGroupLesson: true };
	}
	if (maxParticipants == null && /band|koor/i.test(name)) {
		return { isDuoLesson: false, isGroupLesson: true };
	}
	return { isDuoLesson: false, isGroupLesson: false };
}
