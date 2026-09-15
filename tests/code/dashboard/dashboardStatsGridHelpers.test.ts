import { describe, expect, it } from 'bun:test';
import { NAV_ICONS, NAV_LABELS } from '../../../src/config/nav-labels';
import type { DashboardStats } from '../../../src/lib/dashboard/dashboardDataHelpers';
import {
	buildDashboardStatItems,
	dashboardStatSkeletonKeys,
	dashboardStatsGridClass,
	inactiveCountDescription,
} from '../../../src/lib/dashboard/dashboardStatsGridHelpers';

const stats: DashboardStats = {
	totalStudents: 10,
	activeAgreements: 7,
	inactiveAgreements: 2,
	openSignupRequests: 3,
	activeTeachers: 3,
	availableSlots: 12,
	activeLessonTypes: 4,
};

describe('buildDashboardStatItems', () => {
	it('uses canonical nav labels, icons and values', () => {
		expect(buildDashboardStatItems(stats)).toEqual([
			{
				key: 'students',
				title: NAV_LABELS.students,
				value: 10,
				icon: NAV_ICONS.students,
				href: '/students',
			},
			{
				key: 'agreements',
				title: NAV_LABELS.agreements,
				value: 7,
				icon: NAV_ICONS.agreements,
				href: '/agreements',
				description: '2 inactief',
			},
			{
				key: 'signupRequests',
				title: NAV_LABELS.signupRequests,
				value: 3,
				icon: NAV_ICONS.signupRequests,
				href: '/aanmeldingen',
			},
			{
				key: 'teachers',
				title: NAV_LABELS.teachers,
				value: 3,
				icon: NAV_ICONS.teachers,
				href: '/teachers',
			},
			{
				key: 'availability',
				title: NAV_LABELS.availability,
				value: 12,
				icon: NAV_ICONS.availability,
				href: '/teachers/availability',
			},
			{
				key: 'lessonTypes',
				title: NAV_LABELS.lessonTypes,
				value: 4,
				icon: NAV_ICONS.lessonTypes,
				href: '/lesson-types',
			},
		]);
	});

	it('omits the inactive-agreements description when the count is zero', () => {
		expect(buildDashboardStatItems({ ...stats, inactiveAgreements: 0 })[1]).toEqual({
			key: 'agreements',
			title: NAV_LABELS.agreements,
			value: 7,
			icon: NAV_ICONS.agreements,
			href: '/agreements',
			description: undefined,
		});
	});
});

describe('inactiveCountDescription', () => {
	it('returns undefined when nothing is inactive', () => {
		expect(inactiveCountDescription(0)).toBeUndefined();
	});

	it('returns a Dutch inactive count', () => {
		expect(inactiveCountDescription(2)).toBe('2 inactief');
	});
});

describe('dashboardStatsGridClass', () => {
	it('uses three columns for student-sized grids', () => {
		expect(dashboardStatsGridClass(3)).toBe('grid gap-3 md:grid-cols-2 lg:grid-cols-3');
	});

	it('uses four columns for teacher-sized grids', () => {
		expect(dashboardStatsGridClass(4)).toBe('grid gap-3 md:grid-cols-2 lg:grid-cols-4');
	});

	it('uses six columns for privileged grids', () => {
		expect(dashboardStatsGridClass(6)).toBe('grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6');
	});
});

describe('dashboardStatSkeletonKeys', () => {
	it('returns stable keys for a teacher-sized grid', () => {
		expect(dashboardStatSkeletonKeys(4)).toEqual(['one', 'two', 'three', 'four']);
	});
});
