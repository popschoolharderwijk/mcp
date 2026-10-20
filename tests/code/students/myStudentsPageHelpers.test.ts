import { describe, expect, it } from 'bun:test';
import {
	applyMyStudentsLoadOutcome,
	buildMyStudentsLoadParams,
	collectMyStudentLessonTypes,
	hasMyStudentAgreements,
	hasMyStudentLessonTypes,
	mapMyStudentsPaginatedResponse,
	myStudentDisplayName,
	myStudentInitials,
	shouldRedirectMyStudents,
	shouldShowMyStudentsSkeleton,
	shouldSkipMyStudentsLoad,
} from '../../../src/lib/students/myStudentsPageHelpers';

describe('shouldRedirectMyStudents', () => {
	it('redirects non-teachers after auth loads', () => {
		expect(shouldRedirectMyStudents(false, false)).toBe(true);
	});

	it('does not redirect teachers', () => {
		expect(shouldRedirectMyStudents(false, true)).toBe(false);
	});
});

describe('shouldShowMyStudentsSkeleton', () => {
	it('shows skeleton while auth or data is loading', () => {
		expect(shouldShowMyStudentsSkeleton(true, false)).toBe(true);
		expect(shouldShowMyStudentsSkeleton(false, true)).toBe(true);
	});

	it('hides skeleton when ready', () => {
		expect(shouldShowMyStudentsSkeleton(false, false)).toBe(false);
	});
});

describe('shouldSkipMyStudentsLoad', () => {
	it('skips while auth is loading', () => {
		expect(shouldSkipMyStudentsLoad(true, true, 'teacher-1')).toBe(true);
	});

	it('skips for non-teachers', () => {
		expect(shouldSkipMyStudentsLoad(false, false, 'teacher-1')).toBe(true);
	});

	it('loads for teachers with user id', () => {
		expect(shouldSkipMyStudentsLoad(false, true, 'teacher-1')).toBe(false);
	});
});

describe('buildMyStudentsLoadParams', () => {
	it('builds offset from page and page size', () => {
		expect(buildMyStudentsLoadParams(2, 25, 'anna')).toEqual({
			limit: 25,
			offset: 25,
			search: 'anna',
		});
	});

	it('maps empty search to null', () => {
		expect(buildMyStudentsLoadParams(1, 10, '').search).toBeNull();
	});
});

describe('mapMyStudentsPaginatedResponse', () => {
	it('flattens paginated students and total count', () => {
		const outcome = mapMyStudentsPaginatedResponse({
			data: [
				{
					user_id: 'student-1',
					email: 'student@example.com',
					active_agreements_count: 1,
					profile: {
						first_name: 'Anna',
						last_name: 'Jansen',
						email: 'student@example.com',
						avatar_url: null,
						phone_number: null,
					},
					agreements: [],
				},
			],
			total_count: 1,
			limit: 10,
			offset: 0,
		});

		expect(outcome.kind).toBe('success');
		if (outcome.kind === 'success') {
			expect(outcome.totalCount).toBe(1);
			expect(outcome.students).toHaveLength(1);
			expect(outcome.students[0]?.first_name).toBe('Anna');
		}
	});
});

describe('applyMyStudentsLoadOutcome', () => {
	it('applies success outcome to state setters', () => {
		let studentCount = -1;
		let totalCount = 0;
		applyMyStudentsLoadOutcome(
			{ kind: 'success', students: [], totalCount: 4 },
			(students) => {
				studentCount = students.length;
			},
			(count) => {
				totalCount = count;
			},
		);
		expect(studentCount).toBe(0);
		expect(totalCount).toBe(4);
	});
});

describe('myStudentDisplayName', () => {
	it('returns display name from profile fields', () => {
		expect(
			myStudentDisplayName({
				user_id: 'student-1',
				first_name: 'Anna',
				last_name: 'Jansen',
				email: 'student@example.com',
				avatar_url: null,
				phone_number: null,
				active_agreements_count: 0,
				agreements: [],
			} as never),
		).toBe('Anna Jansen');
	});
});

describe('myStudentInitials', () => {
	it('returns initials from profile fields', () => {
		expect(
			myStudentInitials({
				user_id: 'student-1',
				first_name: 'Anna',
				last_name: 'Jansen',
				email: 'student@example.com',
				avatar_url: null,
				phone_number: null,
				active_agreements_count: 0,
				agreements: [],
			} as never),
		).toBe('AJ');
	});
});

describe('collectMyStudentLessonTypes', () => {
	it('deduplicates lesson types from agreements', () => {
		const lessonTypes = collectMyStudentLessonTypes({
			user_id: 'student-1',
			first_name: 'Anna',
			last_name: 'Jansen',
			email: 'student@example.com',
			avatar_url: null,
			phone_number: null,
			active_agreements_count: 2,
			agreements: [
				{
					id: 'agreement-1',
					day_of_week: 1,
					start_time: '14:00:00',
					start_date: '2026-01-01',
					end_date: null,
					is_active: true,
					notes: null,
					duration_minutes: 45,
					frequency: 'weekly',
					teacher: { first_name: 'Tom', last_name: 'Docent', avatar_url: null },
					lesson_type: { id: 'lt-1', name: 'Piano', icon: null, color: '#000000' },
				},
				{
					id: 'agreement-2',
					day_of_week: 2,
					start_time: '15:00:00',
					start_date: '2026-01-01',
					end_date: null,
					is_active: true,
					notes: null,
					duration_minutes: 45,
					frequency: 'weekly',
					teacher: { first_name: 'Tom', last_name: 'Docent', avatar_url: null },
					lesson_type: { id: 'lt-1', name: 'Piano', icon: null, color: '#000000' },
				},
			],
		} as never);

		expect(lessonTypes).toEqual([{ key: 'lt-1', name: 'Piano' }]);
	});
});

describe('hasMyStudentLessonTypes', () => {
	it('returns false when student has no lesson types', () => {
		expect(
			hasMyStudentLessonTypes({
				user_id: 'student-1',
				first_name: 'Anna',
				last_name: 'Jansen',
				email: 'student@example.com',
				avatar_url: null,
				phone_number: null,
				active_agreements_count: 0,
				agreements: [],
			} as never),
		).toBe(false);
	});
});

describe('hasMyStudentAgreements', () => {
	it('returns true when agreements exist', () => {
		expect(
			hasMyStudentAgreements({
				user_id: 'student-1',
				first_name: 'Anna',
				last_name: 'Jansen',
				email: 'student@example.com',
				avatar_url: null,
				phone_number: null,
				active_agreements_count: 1,
				agreements: [
					{
						id: 'agreement-1',
						day_of_week: 1,
						start_time: '14:00:00',
						start_date: '2026-01-01',
						end_date: null,
						is_active: true,
						notes: null,
						duration_minutes: 45,
						frequency: 'weekly',
						teacher: { first_name: 'Tom', last_name: 'Docent', avatar_url: null },
						lesson_type: { id: 'lt-1', name: 'Piano', icon: null, color: '#000000' },
					},
				],
			} as never),
		).toBe(true);
	});
});
