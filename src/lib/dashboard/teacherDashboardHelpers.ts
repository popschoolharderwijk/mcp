import { NAV_LABELS } from '@/config/nav-labels';
import { type DashboardStudent, parseRecentDashboardStudents } from '@/lib/dashboard/dashboardDataHelpers';
import type { DashboardStatItem } from '@/lib/dashboard/dashboardStatsGridHelpers';
import {
	computeTeacherStatistics,
	type TeacherStatistics,
	type TeacherStatisticsAgreement,
} from '@/lib/statistics/myStatisticsHelpers';
import type { PaginatedStudentsResponseRaw } from '@/types/students';

export const TEACHER_DASHBOARD_STAT_COUNT = 4;

export interface TeacherDashboardStats extends TeacherStatistics {
	availableSlots: number;
}

export interface TeacherDashboardData {
	stats: TeacherDashboardStats;
	recentStudents: DashboardStudent[];
}

export function assembleTeacherDashboardData(params: {
	agreements: TeacherStatisticsAgreement[];
	recentStudentsData: PaginatedStudentsResponseRaw | null;
	availableSlots: number;
}): TeacherDashboardData {
	return {
		stats: {
			...computeTeacherStatistics(params.agreements),
			availableSlots: params.availableSlots,
		},
		recentStudents: parseRecentDashboardStudents(params.recentStudentsData),
	};
}

export function buildTeacherDashboardStatItems(stats: TeacherDashboardStats): DashboardStatItem[] {
	return [
		{
			key: 'myStudents',
			title: NAV_LABELS.myStudents,
			value: stats.studentCount,
			href: '/students/my-students',
		},
		{
			key: 'agreements',
			title: NAV_LABELS.agreements,
			value: stats.lessonsPerWeek,
			href: '/agenda',
		},
		{
			key: 'lessonGroups',
			title: NAV_LABELS.lessonGroups,
			value: stats.groupLessons,
			href: '/agenda',
		},
		{
			key: 'myAvailability',
			title: NAV_LABELS.myAvailability,
			value: stats.availableSlots,
			href: '/teachers/my-availability',
		},
	];
}
