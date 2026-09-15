import { describe, expect, it } from 'bun:test';
import { assembleDashboardDataLoadResult } from '../../../src/lib/dashboard/dashboardDataLoadQueryHelpers';

describe('assembleDashboardDataLoadResult', () => {
	it('returns empty teachers when teacher rows are not loaded', () => {
		expect(
			assembleDashboardDataLoadResult(
				{
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
					teacherUserIds: [],
				},
				null,
			),
		).toEqual({
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
		});
	});

	it('builds teachers when teacher rows are available', () => {
		const result = assembleDashboardDataLoadResult(
			{
				counts: {
					studentsCount: 10,
					activeAgreementsCount: 8,
					totalAgreementsCount: 12,
					openSignupRequestsCount: 3,
					teachersCount: 1,
					slotsCount: 20,
					lessonTypesCount: 5,
				},
				recentStudentsData: null,
				teacherUserIds: ['teacher-1'],
			},
			{
				profiles: [{ user_id: 'teacher-1', display_name: 'Docent A', avatar_url: null }],
				lessonTypeRows: [{ teacher_user_id: 'teacher-1', lesson_types: { name: 'Piano' } }],
				availabilityRows: [{ teacher_user_id: 'teacher-1' }],
			},
		);
		expect(result.teachers).toEqual([
			{
				user_id: 'teacher-1',
				display_name: 'Docent A',
				avatar_url: null,
				lessonTypeNames: ['Piano'],
				availableSlotCount: 1,
			},
		]);
	});
});
