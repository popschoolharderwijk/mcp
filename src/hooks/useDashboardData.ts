import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
	totalStudents: number;
	activeAgreements: number;
	inactiveAgreements: number;
	activeTeachers: number;
	availableSlots: number;
	activeLessonTypes: number;
}

export interface DashboardStudent {
	user_id: string;
	display_name: string;
	email: string;
	avatar_url: string | null;
	status: string;
	created_at: string;
}

export interface DashboardTeacher {
	user_id: string;
	display_name: string;
	avatar_url: string | null;
	lessonTypeNames: string[];
	availableSlotCount: number;
}

interface PaginatedResponse {
	data: Record<string, unknown>[];
	total: number;
}

export function useDashboardData() {
	const { isLoading: authLoading, isPrivileged } = useAuth();
	const [stats, setStats] = useState<DashboardStats | null>(null);
	const [recentStudents, setRecentStudents] = useState<DashboardStudent[]>([]);
	const [teachers, setTeachers] = useState<DashboardTeacher[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const loadData = useCallback(async () => {
		if (!isPrivileged) {
			setIsLoading(false);
			return;
		}

		setIsLoading(true);

		try {
			// Fetch all counts in parallel
			const [
				studentsRes,
				activeAgreementsRes,
				totalAgreementsRes,
				teachersRes,
				slotsRes,
				lessonTypesRes,
				recentStudentsRes,
				teacherListRes,
			] = await Promise.all([
				supabase.from('students').select('*', { count: 'exact', head: true }),
				supabase
					.from('lesson_agreements')
					.select('*', { count: 'exact', head: true })
					.eq('is_active', true),
				supabase.from('lesson_agreements').select('*', { count: 'exact', head: true }),
				supabase
					.from('teachers')
					.select('*', { count: 'exact', head: true })
					.eq('is_active', true),
				supabase.from('teacher_availability').select('*', { count: 'exact', head: true }),
				supabase
					.from('lesson_types')
					.select('*', { count: 'exact', head: true })
					.eq('is_active', true),
				supabase.rpc('get_students_paginated', {
					p_limit: 5,
					p_offset: 0,
					p_sort_column: 'created_at',
					p_sort_direction: 'desc',
				}),
				supabase.from('teachers').select('user_id').eq('is_active', true),
			]);

			setStats({
				totalStudents: studentsRes.count ?? 0,
				activeAgreements: activeAgreementsRes.count ?? 0,
				inactiveAgreements: (totalAgreementsRes.count ?? 0) - (activeAgreementsRes.count ?? 0),
				activeTeachers: teachersRes.count ?? 0,
				availableSlots: slotsRes.count ?? 0,
				activeLessonTypes: lessonTypesRes.count ?? 0,
			});

			// Parse recent students
			const studentsData = recentStudentsRes.data as unknown as PaginatedResponse | null;
			if (studentsData?.data) {
				setRecentStudents(
					studentsData.data.map((s) => ({
						user_id: String(s.user_id ?? ''),
						display_name: String(s.display_name ?? s.email ?? ''),
						email: String(s.email ?? ''),
						avatar_url: s.avatar_url ? String(s.avatar_url) : null,
						status: String(s.status ?? ''),
						created_at: String(s.created_at ?? ''),
					})),
				);
			}

			// Fetch teacher details
			const teacherUserIds = (teacherListRes.data ?? []).map((t) => t.user_id);
			if (teacherUserIds.length > 0) {
				const [profilesRes, tltRes, availRes] = await Promise.all([
					supabase
						.from('view_profiles_with_display_name')
						.select('user_id, display_name, avatar_url')
						.in('user_id', teacherUserIds),
					supabase
						.from('teacher_lesson_types')
						.select('teacher_user_id, lesson_types(name)')
						.in('teacher_user_id', teacherUserIds),
					supabase
						.from('teacher_availability')
						.select('teacher_user_id')
						.in('teacher_user_id', teacherUserIds),
				]);

				const profileMap = new Map(
					(profilesRes.data ?? []).map((p) => [p.user_id, p]),
				);

				// Count availability per teacher
				const availCountMap = new Map<string, number>();
				for (const a of availRes.data ?? []) {
					availCountMap.set(a.teacher_user_id, (availCountMap.get(a.teacher_user_id) ?? 0) + 1);
				}

				// Group lesson type names per teacher
				const ltMap = new Map<string, string[]>();
				for (const tlt of tltRes.data ?? []) {
				const lt = tlt.lesson_types as unknown as { name: string } | null;
				const name = lt?.name;
					if (name) {
						const arr = ltMap.get(tlt.teacher_user_id) ?? [];
						arr.push(name);
						ltMap.set(tlt.teacher_user_id, arr);
					}
				}

				setTeachers(
					teacherUserIds.map((uid) => {
						const profile = profileMap.get(uid);
						return {
							user_id: uid,
							display_name: profile?.display_name ?? '',
							avatar_url: profile?.avatar_url ?? null,
							lessonTypeNames: ltMap.get(uid) ?? [],
							availableSlotCount: availCountMap.get(uid) ?? 0,
						};
					}),
				);
			}
		} catch (err) {
			console.error('Error loading dashboard data:', err);
		} finally {
			setIsLoading(false);
		}
	}, [isPrivileged]);

	useEffect(() => {
		if (!authLoading) {
			loadData();
		}
	}, [authLoading, loadData]);

	return { stats, recentStudents, teachers, isLoading: isLoading || authLoading };
}
