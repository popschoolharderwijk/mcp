import type { IconType } from 'react-icons';
import { NAV_ICONS, NAV_LABELS } from '@/config/nav-labels';
import type { DashboardStats } from '@/lib/dashboard/dashboardDataHelpers';

export const DASHBOARD_STAT_KEYS = [
	'students',
	'agreements',
	'signupRequests',
	'teachers',
	'availability',
	'lessonTypes',
] as const;

type DashboardStatKey = (typeof DASHBOARD_STAT_KEYS)[number];

const DASHBOARD_STAT_HREFS = {
	students: '/students',
	agreements: '/agreements',
	signupRequests: '/aanmeldingen',
	teachers: '/teachers',
	availability: '/teachers/availability',
	lessonTypes: '/lesson-types',
} as const satisfies Record<DashboardStatKey, string>;

export interface DashboardStatItem {
	key: string;
	title: string;
	value: number;
	icon: IconType;
	href: string;
	description?: string;
}

export function inactiveCountDescription(inactiveCount: number): string | undefined {
	if (inactiveCount === 0) return undefined;
	return `${inactiveCount} inactief`;
}

export function dashboardStatsGridClass(count: number): string {
	if (count <= 3) return 'grid gap-3 md:grid-cols-2 lg:grid-cols-3';
	if (count === 4) return 'grid gap-3 md:grid-cols-2 lg:grid-cols-4';
	return 'grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6';
}

const STAT_SKELETON_KEYS = ['one', 'two', 'three', 'four', 'five', 'six'] as const;

export function dashboardStatSkeletonKeys(count: number): string[] {
	return STAT_SKELETON_KEYS.slice(0, count);
}

export function buildDashboardStatItems(stats: DashboardStats): DashboardStatItem[] {
	return [
		{
			key: 'students',
			title: NAV_LABELS.students,
			value: stats.totalStudents,
			icon: NAV_ICONS.students,
			href: DASHBOARD_STAT_HREFS.students,
		},
		{
			key: 'agreements',
			title: NAV_LABELS.agreements,
			value: stats.activeAgreements,
			icon: NAV_ICONS.agreements,
			href: DASHBOARD_STAT_HREFS.agreements,
			description: inactiveCountDescription(stats.inactiveAgreements),
		},
		{
			key: 'signupRequests',
			title: NAV_LABELS.signupRequests,
			value: stats.openSignupRequests,
			icon: NAV_ICONS.signupRequests,
			href: DASHBOARD_STAT_HREFS.signupRequests,
		},
		{
			key: 'teachers',
			title: NAV_LABELS.teachers,
			value: stats.activeTeachers,
			icon: NAV_ICONS.teachers,
			href: DASHBOARD_STAT_HREFS.teachers,
		},
		{
			key: 'availability',
			title: NAV_LABELS.availability,
			value: stats.availableSlots,
			icon: NAV_ICONS.availability,
			href: DASHBOARD_STAT_HREFS.availability,
		},
		{
			key: 'lessonTypes',
			title: NAV_LABELS.lessonTypes,
			value: stats.activeLessonTypes,
			icon: NAV_ICONS.lessonTypes,
			href: DASHBOARD_STAT_HREFS.lessonTypes,
		},
	];
}
