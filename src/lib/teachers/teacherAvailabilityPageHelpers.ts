import type { Tables } from '@/integrations/supabase/types';
import type { TeacherAvailabilityOverviewTeacher } from '@/lib/teachers/loadTeacherAvailabilityOverview';

type Availability = Tables<'teacher_availability'>;

export function filterTeacherAvailability(
	availability: Availability[],
	selectedTeacherUserId: string | 'all',
): Availability[] {
	if (selectedTeacherUserId === 'all') return availability;
	return availability.filter((slot) => slot.teacher_user_id === selectedTeacherUserId);
}

export function groupAvailabilityByDay<T extends { day_of_week: number }>(
	availability: T[],
): Partial<Record<number, T[]>> {
	return Object.groupBy(availability, (slot) => slot.day_of_week);
}

export function shouldShowTeacherNameOnAvailabilitySlot(selectedTeacherUserId: string | 'all'): boolean {
	return selectedTeacherUserId === 'all';
}

export function findTeacherForAvailabilitySlot(
	teachers: TeacherAvailabilityOverviewTeacher[],
	teacherUserId: string,
): TeacherAvailabilityOverviewTeacher | undefined {
	return teachers.find((teacher) => teacher.user_id === teacherUserId);
}
