import type { FreeSlotForTeacher } from '@/lib/agreementSlots';
import type { TrialLessonSchedulingTeacher } from '@/lib/trial-lessons/loadTrialLessonSchedulingData';

export function isTrialLessonSlotSelected(selected: FreeSlotForTeacher | null, slot: FreeSlotForTeacher): boolean {
	if (!selected) return false;
	return (
		selected.date === slot.date &&
		selected.start_time === slot.start_time &&
		selected.teacher_user_id === slot.teacher_user_id
	);
}

export function getTrialLessonSlotKey(slot: FreeSlotForTeacher): string {
	return `${slot.date}-${slot.start_time}-${slot.teacher_user_id}`;
}

export function mapTeacherInfoFromProfile(profile: {
	user_id: string;
	first_name: string | null;
	last_name: string | null;
	avatar_url: string | null;
}): TrialLessonSchedulingTeacher {
	return {
		user_id: profile.user_id,
		first_name: profile.first_name ?? null,
		last_name: profile.last_name ?? null,
		avatar_url: profile.avatar_url ?? null,
	};
}
