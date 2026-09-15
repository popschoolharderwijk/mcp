import type { SupabaseClient } from '@supabase/supabase-js';
import { assertDashboardQueriesOk } from '@/lib/dashboard/dashboardLoadErrorPure';
import { assembleTeacherDashboardData, type TeacherDashboardData } from '@/lib/dashboard/teacherDashboardHelpers';
import type { TeacherStatisticsAgreement } from '@/lib/statistics/myStatisticsHelpers';
import type { PaginatedStudentsResponseRaw } from '@/types/students';

export async function fetchTeacherDashboardData(
	supabase: SupabaseClient,
	teacherUserId: string,
): Promise<TeacherDashboardData> {
	const [agreementsRes, studentsRes, slotsRes] = await Promise.all([
		supabase
			.from('lesson_agreements')
			.select('student_user_id, lesson_type_id, is_active, lesson_types!inner(is_group_lesson)')
			.eq('teacher_user_id', teacherUserId)
			.eq('is_active', true),
		supabase.rpc('get_students_paginated', {
			p_limit: 5,
			p_offset: 0,
			p_sort_column: 'created_at',
			p_sort_direction: 'desc',
		}),
		supabase
			.from('teacher_availability')
			.select('*', { count: 'exact', head: true })
			.eq('teacher_user_id', teacherUserId),
	]);

	assertDashboardQueriesOk([
		{ label: 'teacher agreements', error: agreementsRes.error },
		{ label: 'recent students', error: studentsRes.error },
		{ label: 'availability slots', error: slotsRes.error },
	]);

	return assembleTeacherDashboardData({
		agreements: (agreementsRes.data ?? []) as TeacherStatisticsAgreement[],
		recentStudentsData: studentsRes.data as unknown as PaginatedStudentsResponseRaw | null,
		availableSlots: slotsRes.count ?? 0,
	});
}
