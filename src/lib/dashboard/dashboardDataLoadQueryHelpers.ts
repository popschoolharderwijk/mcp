import type { SupabaseClient } from '@supabase/supabase-js';
import {
	buildDashboardStats,
	buildDashboardTeachers,
	countAvailabilityByTeacher,
	type DashboardCountResults,
	type DashboardDataLoadResult,
	groupLessonTypeNamesByTeacher,
	parseRecentDashboardStudents,
} from '@/lib/dashboard/dashboardDataHelpers';
import { assertDashboardQueriesOk } from '@/lib/dashboard/dashboardLoadErrorPure';
import { OPEN_SIGNUP_REQUEST_STATUSES } from '@/lib/signup-requests/signupRequestStatuses';
import type { PaginatedStudentsResponseRaw } from '@/types/students';

export interface DashboardCoreQueryResults {
	counts: DashboardCountResults;
	recentStudentsData: PaginatedStudentsResponseRaw | null;
	teacherUserIds: string[];
}

export async function fetchDashboardCoreQueryResults(supabase: SupabaseClient): Promise<DashboardCoreQueryResults> {
	const [
		studentsRes,
		activeAgreementsRes,
		totalAgreementsRes,
		openSignupRequestsRes,
		teachersRes,
		slotsRes,
		lessonTypesRes,
		recentStudentsRes,
		teacherListRes,
	] = await Promise.all([
		supabase.from('students').select('*', { count: 'exact', head: true }),
		supabase.from('lesson_agreements').select('*', { count: 'exact', head: true }).eq('is_active', true),
		supabase.from('lesson_agreements').select('*', { count: 'exact', head: true }),
		supabase
			.from('lesson_signup_requests')
			.select('*', { count: 'exact', head: true })
			.in('status', [...OPEN_SIGNUP_REQUEST_STATUSES]),
		supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('is_active', true),
		supabase.from('teacher_availability').select('*', { count: 'exact', head: true }),
		supabase.from('lesson_types').select('*', { count: 'exact', head: true }).eq('is_active', true),
		supabase.rpc('get_students_paginated', {
			p_limit: 5,
			p_offset: 0,
			p_sort_column: 'created_at',
			p_sort_direction: 'desc',
		}),
		supabase.from('teachers').select('user_id').eq('is_active', true),
	]);

	assertDashboardQueriesOk([
		{ label: 'students count', error: studentsRes.error },
		{ label: 'active agreements count', error: activeAgreementsRes.error },
		{ label: 'total agreements count', error: totalAgreementsRes.error },
		{ label: 'open signup requests count', error: openSignupRequestsRes.error },
		{ label: 'teachers count', error: teachersRes.error },
		{ label: 'availability slots count', error: slotsRes.error },
		{ label: 'lesson types count', error: lessonTypesRes.error },
		{ label: 'recent students', error: recentStudentsRes.error },
		{ label: 'teacher list', error: teacherListRes.error },
	]);

	return {
		counts: {
			studentsCount: studentsRes.count,
			activeAgreementsCount: activeAgreementsRes.count,
			totalAgreementsCount: totalAgreementsRes.count,
			openSignupRequestsCount: openSignupRequestsRes.count,
			teachersCount: teachersRes.count,
			slotsCount: slotsRes.count,
			lessonTypesCount: lessonTypesRes.count,
		},
		recentStudentsData: recentStudentsRes.data as unknown as PaginatedStudentsResponseRaw | null,
		teacherUserIds: (teacherListRes.data ?? []).map((row) => row.user_id),
	};
}

export async function fetchDashboardTeacherRows(
	supabase: SupabaseClient,
	teacherUserIds: string[],
): Promise<{
	profiles: { user_id: string; display_name: string; avatar_url: string | null }[];
	lessonTypeRows: { teacher_user_id: string; lesson_types: { name: string } | null }[];
	availabilityRows: { teacher_user_id: string }[];
}> {
	const [profilesRes, tltRes, availRes] = await Promise.all([
		supabase
			.from('view_profiles_with_display_name')
			.select('user_id, display_name, avatar_url')
			.in('user_id', teacherUserIds),
		supabase
			.from('teacher_lesson_types')
			.select('teacher_user_id, lesson_types(name)')
			.in('teacher_user_id', teacherUserIds),
		supabase.from('teacher_availability').select('teacher_user_id').in('teacher_user_id', teacherUserIds),
	]);

	assertDashboardQueriesOk([
		{ label: 'teacher profiles', error: profilesRes.error },
		{ label: 'teacher lesson types', error: tltRes.error },
		{ label: 'teacher availability rows', error: availRes.error },
	]);

	const lessonTypeRows = (tltRes.data ?? []).map((row) => ({
		teacher_user_id: row.teacher_user_id,
		lesson_types: row.lesson_types as unknown as { name: string } | null,
	}));

	return {
		profiles: profilesRes.data ?? [],
		lessonTypeRows,
		availabilityRows: availRes.data ?? [],
	};
}

export function assembleDashboardDataLoadResult(
	core: DashboardCoreQueryResults,
	teacherRows: Awaited<ReturnType<typeof fetchDashboardTeacherRows>> | null,
): DashboardDataLoadResult {
	const stats = buildDashboardStats(core.counts);
	const recentStudents = parseRecentDashboardStudents(core.recentStudentsData);

	if (!teacherRows) {
		return { stats, recentStudents, teachers: [] };
	}

	const teachers = buildDashboardTeachers(
		core.teacherUserIds,
		teacherRows.profiles,
		groupLessonTypeNamesByTeacher(teacherRows.lessonTypeRows),
		countAvailabilityByTeacher(teacherRows.availabilityRows),
	);

	return { stats, recentStudents, teachers };
}
