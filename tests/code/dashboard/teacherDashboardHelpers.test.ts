import { describe, expect, it } from 'bun:test';
import { NAV_ICONS, NAV_LABELS } from '../../../src/config/nav-labels';
import {
	assembleTeacherDashboardData,
	buildTeacherDashboardStatItems,
} from '../../../src/lib/dashboard/teacherDashboardHelpers';

describe('assembleTeacherDashboardData', () => {
	it('combines teacher statistics with availability slots', () => {
		expect(
			assembleTeacherDashboardData({
				agreements: [
					{ student_user_id: 's1', lesson_types: { is_group_lesson: false } },
					{ student_user_id: 's2', lesson_types: { is_group_lesson: true } },
				],
				recentStudentsData: null,
				availableSlots: 4,
			}),
		).toEqual({
			stats: {
				studentCount: 2,
				lessonsPerWeek: 2,
				groupLessons: 1,
				upcomingLessons: 2,
				availableSlots: 4,
			},
			recentStudents: [],
		});
	});
});

describe('buildTeacherDashboardStatItems', () => {
	it('uses teacher destinations and nav labels', () => {
		expect(
			buildTeacherDashboardStatItems({
				studentCount: 2,
				lessonsPerWeek: 3,
				groupLessons: 1,
				upcomingLessons: 3,
				availableSlots: 4,
			}),
		).toEqual([
			{
				key: 'myStudents',
				title: NAV_LABELS.myStudents,
				value: 2,
				icon: NAV_ICONS.myStudents,
				href: '/students/my-students',
			},
			{
				key: 'agreements',
				title: NAV_LABELS.agreements,
				value: 3,
				icon: NAV_ICONS.agreements,
				href: '/agenda',
			},
			{
				key: 'lessonGroups',
				title: NAV_LABELS.lessonGroups,
				value: 1,
				icon: NAV_ICONS.lessonGroups,
				href: '/agenda',
			},
			{
				key: 'myAvailability',
				title: NAV_LABELS.myAvailability,
				value: 4,
				icon: NAV_ICONS.myAvailability,
				href: '/teachers/my-availability',
			},
		]);
	});
});
