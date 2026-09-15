import { describe, expect, it } from 'bun:test';
import {
	dashboardStateAfterLoad,
	emptyDashboardViewData,
	loadDashboardAudienceData,
} from '../../../src/lib/dashboard/dashboardAudienceLoadHelpers';
import type { DashboardDataLoadResult } from '../../../src/lib/dashboard/dashboardDataHelpers';
import type { StudentDashboardData } from '../../../src/lib/dashboard/studentDashboardHelpers';
import type { TeacherDashboardData } from '../../../src/lib/dashboard/teacherDashboardHelpers';

const privilegedData: DashboardDataLoadResult = {
	stats: {
		totalStudents: 10,
		activeAgreements: 7,
		inactiveAgreements: 2,
		openSignupRequests: 3,
		activeTeachers: 3,
		availableSlots: 12,
		activeLessonTypes: 4,
	},
	recentStudents: [
		{
			user_id: 'student-1',
			display_name: 'Leerling',
			email: 'leerling@example.com',
			avatar_url: null,
			status: 'active',
			created_at: '2026-09-01',
		},
	],
	teachers: [
		{
			user_id: 'teacher-1',
			display_name: 'Docent',
			avatar_url: null,
			lessonTypeNames: ['Piano'],
			availableSlotCount: 2,
		},
	],
};

const teacherDashboard: TeacherDashboardData = {
	stats: {
		studentCount: 2,
		lessonsPerWeek: 3,
		groupLessons: 1,
		upcomingLessons: 3,
		availableSlots: 4,
	},
	recentStudents: privilegedData.recentStudents,
};

const studentDashboard: StudentDashboardData = {
	stats: {
		activeAgreements: 1,
		inactiveAgreements: 0,
		openInvoices: 2,
		trialCount: 1,
		trialStatus: 'scheduled',
	},
	agreements: [],
	invoices: [],
};

const current = {
	...emptyDashboardViewData,
	stats: privilegedData.stats,
	recentStudents: privilegedData.recentStudents,
	teachers: privilegedData.teachers,
};

describe('loadDashboardAudienceData', () => {
	it('loads privileged dashboard data', async () => {
		expect(
			await loadDashboardAudienceData(
				{ audience: 'privileged', teacherUserId: null, userId: 'user-1' },
				{
					privileged: async () => privilegedData,
					teacher: async () => teacherDashboard,
					student: async () => studentDashboard,
				},
			),
		).toEqual({ kind: 'privileged', data: privilegedData });
	});

	it('returns privileged-empty when the privileged loader yields nothing', async () => {
		expect(
			await loadDashboardAudienceData(
				{ audience: 'privileged', teacherUserId: null, userId: 'user-1' },
				{
					privileged: async () => null,
					teacher: async () => teacherDashboard,
					student: async () => studentDashboard,
				},
			),
		).toEqual({ kind: 'privileged-empty' });
	});

	it('skips the teacher load when no teacher user id is present', async () => {
		let teacherLoaderCalled = false;
		expect(
			await loadDashboardAudienceData(
				{ audience: 'teacher', teacherUserId: null, userId: 'user-1' },
				{
					privileged: async () => privilegedData,
					teacher: async () => {
						teacherLoaderCalled = true;
						return teacherDashboard;
					},
					student: async () => studentDashboard,
				},
			),
		).toEqual({ kind: 'skip' });
		expect(teacherLoaderCalled).toBe(false);
	});

	it('skips the student load when no user id is present', async () => {
		expect(
			await loadDashboardAudienceData(
				{ audience: 'student', teacherUserId: null, userId: undefined },
				{
					privileged: async () => privilegedData,
					teacher: async () => teacherDashboard,
					student: async () => studentDashboard,
				},
			),
		).toEqual({ kind: 'skip' });
	});

	it('loads student dashboard data', async () => {
		expect(
			await loadDashboardAudienceData(
				{ audience: 'student', teacherUserId: null, userId: 'student-1' },
				{
					privileged: async () => privilegedData,
					teacher: async () => teacherDashboard,
					student: async () => studentDashboard,
				},
			),
		).toEqual({ kind: 'student', studentDashboard });
	});
});

describe('dashboardStateAfterLoad', () => {
	it('replaces state for privileged data', () => {
		expect(dashboardStateAfterLoad(emptyDashboardViewData, { kind: 'privileged', data: privilegedData })).toEqual({
			stats: privilegedData.stats,
			recentStudents: privilegedData.recentStudents,
			teachers: privilegedData.teachers,
			teacherDashboard: null,
			studentDashboard: null,
		});
	});

	it('clears role dashboards without dropping privileged stats when the load is empty', () => {
		expect(dashboardStateAfterLoad(current, { kind: 'privileged-empty' })).toEqual({
			...current,
			teacherDashboard: null,
			studentDashboard: null,
		});
	});

	it('replaces state for teacher data', () => {
		expect(dashboardStateAfterLoad(current, { kind: 'teacher', teacherDashboard })).toEqual({
			stats: null,
			recentStudents: teacherDashboard.recentStudents,
			teachers: [],
			teacherDashboard,
			studentDashboard: null,
		});
	});

	it('replaces state for student data', () => {
		expect(dashboardStateAfterLoad(current, { kind: 'student', studentDashboard })).toEqual({
			stats: null,
			recentStudents: [],
			teachers: [],
			teacherDashboard: null,
			studentDashboard,
		});
	});

	it('clears dashboard state when the load is skipped', () => {
		expect(dashboardStateAfterLoad(current, { kind: 'skip' })).toEqual(emptyDashboardViewData);
	});
});
