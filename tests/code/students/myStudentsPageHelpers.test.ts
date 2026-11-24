import { describe, expect, it } from 'bun:test';
import {
	buildMyStudentsLoadParams,
	collectMyStudentLessonTypes,
	mapMyStudentsPaginatedResponse,
} from '../../../src/lib/students/myStudentsPageHelpers';

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
					agreements_count: 1,
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

		expect(outcome).toEqual({
			totalCount: 1,
			students: [
				expect.objectContaining({
					user_id: 'student-1',
					first_name: 'Anna',
					last_name: 'Jansen',
				}),
			],
		});
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
			agreements_count: 2,
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
					price_per_lesson: 25,
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
					price_per_lesson: 25,
					teacher: { first_name: 'Tom', last_name: 'Docent', avatar_url: null },
					lesson_type: { id: 'lt-1', name: 'Piano', icon: null, color: '#000000' },
				},
			],
		} as never);

		expect(lessonTypes).toEqual([{ key: 'lt-1', name: 'Piano' }]);
	});
});
