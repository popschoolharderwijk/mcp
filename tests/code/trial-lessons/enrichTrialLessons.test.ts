import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import type { EnrichedTrialLessonStaff } from '../../../src/lib/trial-lessons/enrichTrialLessons';

type QueryResult = { data: unknown; error: null };

let profilesResult: QueryResult = { data: [], error: null };
let lessonTypesResult: QueryResult = { data: [], error: null };

const supabaseMock = {
	from: (table: string) => ({
		select: () => ({
			in: () =>
				Promise.resolve(
					table === 'profiles'
						? profilesResult
						: table === 'lesson_types'
							? lessonTypesResult
							: { data: [], error: null },
				),
		}),
	}),
};

mock.module('../../../src/integrations/supabase/client', () => ({
	supabase: supabaseMock,
}));

const trial = {
	id: 'trial-1',
	student_user_id: 'stu-1',
	teacher_user_id: 'tea-1',
	lesson_type_id: 'lt-1',
	lesson_type_option_id: null,
	scheduled_date: '2026-09-07',
	scheduled_start_time: '14:00:00',
	duration_minutes: 60,
	status: 'scheduled' as const,
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
	created_by: null,
	updated_by: null,
	notes: null,
	admin_processed_at: null,
	admin_processed_by: null,
	agenda_event_id: null,
	created_agreement_id: null,
	signup_request_id: null,
	student_decision_at: null,
};

describe('enrichTrialLessons', () => {
	let enrichTrialLessons: typeof import('../../../src/lib/trial-lessons/enrichTrialLessons').enrichTrialLessons;

	beforeAll(async () => {
		({ enrichTrialLessons } = await import('../../../src/lib/trial-lessons/enrichTrialLessons'));
	});

	beforeEach(() => {
		profilesResult = {
			data: [
				{
					user_id: 'tea-1',
					first_name: 'Piet',
					last_name: 'Docent',
					email: 'piet@example.com',
					avatar_url: 'https://example.com/piet.png',
				},
			],
			error: null,
		};
		lessonTypesResult = {
			data: [{ id: 'lt-1', name: 'Piano' }],
			error: null,
		};
	});

	it('adds teacher profile and lesson type name without student fields by default', async () => {
		const result = await enrichTrialLessons([trial]);
		expect(result).toHaveLength(1);
		expect(result[0]?.teacher).toEqual({
			first_name: 'Piet',
			last_name: 'Docent',
			email: 'piet@example.com',
			avatar_url: 'https://example.com/piet.png',
		});
		expect(result[0]?.lesson_type_name).toBe('Piano');
		expect(Object.hasOwn(result[0] ?? {}, 'student')).toBe(false);
	});

	it('adds student profile when includeStudent is true', async () => {
		profilesResult = {
			data: [
				{
					user_id: 'tea-1',
					first_name: 'Piet',
					last_name: 'Docent',
					email: 'piet@example.com',
					avatar_url: null,
				},
				{
					user_id: 'stu-1',
					first_name: 'Jan',
					last_name: 'Jansen',
					email: 'jan@example.com',
					avatar_url: 'https://example.com/jan.png',
				},
			],
			error: null,
		};
		const result = (await enrichTrialLessons([trial], { includeStudent: true })) as EnrichedTrialLessonStaff[];
		expect(result[0]?.student).toEqual({
			first_name: 'Jan',
			last_name: 'Jansen',
			email: 'jan@example.com',
			avatar_url: 'https://example.com/jan.png',
		});
	});

	it('uses empty profiles when related records are missing', async () => {
		profilesResult = { data: [], error: null };
		lessonTypesResult = { data: [], error: null };
		const result = (await enrichTrialLessons([trial], { includeStudent: true })) as EnrichedTrialLessonStaff[];
		expect(result[0]?.teacher).toEqual({
			first_name: null,
			last_name: null,
			avatar_url: null,
			email: '',
		});
		expect(result[0]?.lesson_type_name).toBeNull();
		expect(result[0]?.student).toEqual({
			first_name: null,
			last_name: null,
			avatar_url: null,
			email: '',
		});
	});

	it('returns an empty array for no trials', async () => {
		const result = await enrichTrialLessons([]);
		expect(result).toEqual([]);
	});

	it('deduplicates profile and lesson type lookups for multiple trials', async () => {
		const trialTwo = { ...trial, id: 'trial-2', student_user_id: 'stu-2' };
		profilesResult = {
			data: [
				{
					user_id: 'tea-1',
					first_name: 'Piet',
					last_name: 'Docent',
					email: 'piet@example.com',
					avatar_url: null,
				},
				{
					user_id: 'stu-1',
					first_name: 'Jan',
					last_name: 'Jansen',
					email: 'jan@example.com',
					avatar_url: null,
				},
				{
					user_id: 'stu-2',
					first_name: 'Anna',
					last_name: 'Bakker',
					email: 'anna@example.com',
					avatar_url: null,
				},
			],
			error: null,
		};

		const result = (await enrichTrialLessons([trial, trialTwo], {
			includeStudent: true,
		})) as EnrichedTrialLessonStaff[];
		expect(result).toHaveLength(2);
		expect(result[0]?.student).toEqual({
			first_name: 'Jan',
			last_name: 'Jansen',
			email: 'jan@example.com',
			avatar_url: null,
		});
		expect(result[1]?.student).toEqual({
			first_name: 'Anna',
			last_name: 'Bakker',
			email: 'anna@example.com',
			avatar_url: null,
		});
		expect(result[0]?.teacher.first_name).toBe('Piet');
		expect(result[1]?.lesson_type_name).toBe('Piano');
	});
});
