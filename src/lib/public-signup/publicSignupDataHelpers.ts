import type { SupabaseClient } from '@supabase/supabase-js';
import type { GroupOption } from '@/pages/public-signup/types';

interface LessonGroupRow {
	id: string;
	name: string;
	day_of_week: number;
	start_time: string;
	duration_minutes: number;
	frequency: string;
	teacher_user_id: string;
}

interface ProfileRow {
	user_id: string;
	first_name: string | null;
	last_name: string | null;
}

interface MemberRow {
	lesson_group_id: string;
}

function mapPublicSignupGroupOptions(
	lessonGroups: LessonGroupRow[],
	profiles: ProfileRow[],
	members: MemberRow[],
): GroupOption[] {
	const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));
	const memberCounts = new Map<string, number>();

	for (const member of members) {
		memberCounts.set(member.lesson_group_id, (memberCounts.get(member.lesson_group_id) ?? 0) + 1);
	}

	return lessonGroups.map((group) => {
		const profile = profileMap.get(group.teacher_user_id);
		return {
			id: group.id,
			name: group.name,
			day_of_week: group.day_of_week,
			start_time: group.start_time,
			duration_minutes: group.duration_minutes,
			frequency: group.frequency,
			teacher_name: profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') : null,
			members_count: memberCounts.get(group.id) ?? 0,
		};
	});
}

function collectUniqueTeacherIds(lessonGroups: LessonGroupRow[]): string[] {
	return [...new Set(lessonGroups.map((group) => group.teacher_user_id))];
}

function collectLessonGroupIds(lessonGroups: LessonGroupRow[]): string[] {
	return lessonGroups.map((group) => group.id);
}

export async function fetchPublicSignupGroupOptions(
	supabase: SupabaseClient,
	lessonTypeId: string,
): Promise<GroupOption[]> {
	const { data: lessonGroups } = await supabase
		.from('lesson_groups')
		.select('id, name, day_of_week, start_time, duration_minutes, frequency, teacher_user_id')
		.eq('lesson_type_id', lessonTypeId)
		.eq('is_active', true);

	if (!lessonGroups?.length) return [];

	const teacherIds = collectUniqueTeacherIds(lessonGroups);
	const groupIds = collectLessonGroupIds(lessonGroups);

	const [{ data: profiles }, { data: members }] = await Promise.all([
		supabase.from('profiles').select('user_id, first_name, last_name').in('user_id', teacherIds),
		supabase
			.from('lesson_group_members')
			.select('lesson_group_id')
			.in('lesson_group_id', groupIds)
			.is('left_date', null),
	]);

	return mapPublicSignupGroupOptions(lessonGroups, profiles ?? [], members ?? []);
}
