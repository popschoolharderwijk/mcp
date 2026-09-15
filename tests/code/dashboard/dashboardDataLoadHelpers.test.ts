import { beforeAll, describe, expect, it, mock } from 'bun:test';

let teacherUserIds: string[] = ['teacher-1', 'teacher-2'];

const coreResults = {
	counts: {
		studentsCount: 10,
		activeAgreementsCount: 8,
		totalAgreementsCount: 12,
		openSignupRequestsCount: 3,
		teachersCount: 2,
		slotsCount: 20,
		lessonTypesCount: 5,
	},
	recentStudentsData: null,
	get teacherUserIds() {
		return teacherUserIds;
	},
};

const assembledWithoutTeachers = {
	stats: {
		totalStudents: 10,
		activeAgreements: 8,
		inactiveAgreements: 4,
		openSignupRequests: 3,
		activeTeachers: 2,
		availableSlots: 20,
		activeLessonTypes: 5,
	},
	recentStudents: [],
	teachers: [],
};

const assembledWithTeachers = {
	...assembledWithoutTeachers,
	teachers: [
		{
			user_id: 'teacher-1',
			display_name: 'Docent A',
			avatar_url: null,
			lessonTypeNames: ['Piano'],
			availableSlotCount: 1,
		},
	],
};

mock.module('../../../src/lib/dashboard/dashboardDataLoadQueryHelpers', () => ({
	fetchDashboardCoreQueryResults: async () => coreResults,
	fetchDashboardTeacherRows: async () => ({
		profiles: [{ user_id: 'teacher-1', display_name: 'Docent A', avatar_url: null }],
		lessonTypeRows: [{ teacher_user_id: 'teacher-1', lesson_types: { name: 'Piano' } }],
		availabilityRows: [{ teacher_user_id: 'teacher-1' }],
	}),
	assembleDashboardDataLoadResult: (_core: unknown, teacherRows: unknown) =>
		teacherRows ? assembledWithTeachers : assembledWithoutTeachers,
}));

describe('fetchDashboardData', () => {
	let fetchDashboardData: typeof import('../../../src/lib/dashboard/dashboardDataLoadHelpers').fetchDashboardData;

	beforeAll(async () => {
		({ fetchDashboardData } = await import('../../../src/lib/dashboard/dashboardDataLoadHelpers'));
	});

	it('returns null for non-privileged users', async () => {
		expect(await fetchDashboardData({} as never, false)).toBeNull();
	});

	it('returns dashboard data without teacher rows when no teachers exist', async () => {
		teacherUserIds = [];
		expect(await fetchDashboardData({} as never, true)).toEqual(assembledWithoutTeachers);
		teacherUserIds = ['teacher-1', 'teacher-2'];
	});

	it('loads teacher rows when teacher ids exist', async () => {
		expect(await fetchDashboardData({} as never, true)).toEqual(assembledWithTeachers);
	});
});
