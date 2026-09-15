import { describe, expect, it } from 'bun:test';
import {
	buildDashboardStats,
	buildDashboardTeachers,
	countAvailabilityByTeacher,
	groupLessonTypeNamesByTeacher,
	parseRecentDashboardStudents,
} from '../../../src/lib/dashboard/dashboardDataHelpers';

describe('buildDashboardStats', () => {
	it('defaults null counts to zero', () => {
		expect(
			buildDashboardStats({
				studentsCount: null,
				activeAgreementsCount: null,
				totalAgreementsCount: null,
				openSignupRequestsCount: null,
				teachersCount: null,
				slotsCount: null,
				lessonTypesCount: null,
			}),
		).toEqual({
			totalStudents: 0,
			activeAgreements: 0,
			inactiveAgreements: 0,
			openSignupRequests: 0,
			activeTeachers: 0,
			availableSlots: 0,
			activeLessonTypes: 0,
		});
	});

	it('calculates inactive agreements from totals', () => {
		expect(
			buildDashboardStats({
				studentsCount: 10,
				activeAgreementsCount: 7,
				totalAgreementsCount: 9,
				openSignupRequestsCount: 3,
				teachersCount: 3,
				slotsCount: 12,
				lessonTypesCount: 4,
			}),
		).toEqual({
			totalStudents: 10,
			activeAgreements: 7,
			inactiveAgreements: 2,
			openSignupRequests: 3,
			activeTeachers: 3,
			availableSlots: 12,
			activeLessonTypes: 4,
		});
	});
});

describe('parseRecentDashboardStudents', () => {
	it('returns empty array for missing data', () => {
		expect(parseRecentDashboardStudents(null)).toEqual([]);
	});

	it('marks students without active agreements as inactive', () => {
		expect(
			parseRecentDashboardStudents({
				data: [
					{
						user_id: 'user-2',
						created_at: '2026-02-01T00:00:00Z',
						created_by: null,
						updated_at: '2026-02-01T00:00:00Z',
						updated_by: null,
						date_of_birth: null,
						debtor_address: null,
						debtor_city: null,
						debtor_info_same_as_student: true,
						debtor_name: null,
						debtor_postal_code: null,
						parent_email: null,
						parent_name: null,
						parent_phone_number: null,
						active_agreements_count: 0,
						profile: {
							user_id: 'user-2',
							email: '',
							first_name: 'Zoe',
							last_name: 'Zwart',
							avatar_url: 'https://example.com/zoe.png',
							phone_number: null,
						},
						agreements: [],
					},
				],
				total_count: 1,
				limit: 5,
				offset: 0,
			}),
		).toEqual([
			{
				user_id: 'user-2',
				display_name: 'Zoe Zwart',
				email: '',
				avatar_url: 'https://example.com/zoe.png',
				status: 'inactive',
				created_at: '2026-02-01T00:00:00Z',
			},
		]);
	});

	it('maps paginated students to dashboard rows', () => {
		expect(
			parseRecentDashboardStudents({
				data: [
					{
						user_id: 'user-1',
						created_at: '2026-01-01T00:00:00Z',
						created_by: null,
						updated_at: '2026-01-01T00:00:00Z',
						updated_by: null,
						date_of_birth: null,
						debtor_address: null,
						debtor_city: null,
						debtor_info_same_as_student: true,
						debtor_name: null,
						debtor_postal_code: null,
						parent_email: null,
						parent_name: null,
						parent_phone_number: null,
						active_agreements_count: 1,
						profile: {
							user_id: 'user-1',
							email: 'anna@example.com',
							first_name: 'Anna',
							last_name: 'Bakker',
							avatar_url: null,
							phone_number: null,
						},
						agreements: [],
					},
				],
				total_count: 1,
				limit: 5,
				offset: 0,
			}),
		).toEqual([
			{
				user_id: 'user-1',
				display_name: 'Anna Bakker',
				email: 'anna@example.com',
				avatar_url: null,
				status: 'active',
				created_at: '2026-01-01T00:00:00Z',
			},
		]);
	});
});

describe('countAvailabilityByTeacher', () => {
	it('counts slots per teacher', () => {
		expect(
			countAvailabilityByTeacher([
				{ teacher_user_id: 'teacher-1' },
				{ teacher_user_id: 'teacher-1' },
				{ teacher_user_id: 'teacher-2' },
			]),
		).toEqual(
			new Map([
				['teacher-1', 2],
				['teacher-2', 1],
			]),
		);
	});
});

describe('groupLessonTypeNamesByTeacher', () => {
	it('skips rows without a lesson type name', () => {
		expect(
			groupLessonTypeNamesByTeacher([
				{ teacher_user_id: 'teacher-1', lesson_types: null },
				{ teacher_user_id: 'teacher-1', lesson_types: { name: 'Piano' } },
			]),
		).toEqual(new Map([['teacher-1', ['Piano']]]));
	});

	it('groups lesson type names per teacher', () => {
		expect(
			groupLessonTypeNamesByTeacher([
				{ teacher_user_id: 'teacher-1', lesson_types: { name: 'Piano' } },
				{ teacher_user_id: 'teacher-1', lesson_types: { name: 'Gitaar' } },
			]),
		).toEqual(new Map([['teacher-1', ['Piano', 'Gitaar']]]));
	});
});

describe('buildDashboardTeachers', () => {
	it('uses empty defaults when profile and counts are missing', () => {
		expect(buildDashboardTeachers(['teacher-9'], [], new Map(), new Map())).toEqual([
			{
				user_id: 'teacher-9',
				display_name: '',
				avatar_url: null,
				lessonTypeNames: [],
				availableSlotCount: 0,
			},
		]);
	});

	it('builds teacher rows with profile and counts', () => {
		expect(
			buildDashboardTeachers(
				['teacher-1'],
				[{ user_id: 'teacher-1', display_name: 'Jan Docent', avatar_url: null }],
				new Map([['teacher-1', ['Piano']]]),
				new Map([['teacher-1', 3]]),
			),
		).toEqual([
			{
				user_id: 'teacher-1',
				display_name: 'Jan Docent',
				avatar_url: null,
				lessonTypeNames: ['Piano'],
				availableSlotCount: 3,
			},
		]);
	});
});
