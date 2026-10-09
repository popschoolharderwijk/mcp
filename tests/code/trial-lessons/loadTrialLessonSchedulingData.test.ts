import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

type QueryResult = { data: unknown; error: null };

const tableResults: Record<string, QueryResult> = {};

function thenableResult(table: string) {
	const result = tableResults[table] ?? { data: [], error: null };
	const promise = Promise.resolve(result);
	return Object.assign(promise, {
		select: () => thenableResult(table),
		eq: () => thenableResult(table),
		in: () => thenableResult(table),
		lte: () => thenableResult(table),
		gte: () => thenableResult(table),
	});
}

mock.module('../../../src/integrations/supabase/client', () => ({
	supabase: {
		from: (table: string) => thenableResult(table),
	},
}));

describe('loadTrialLessonSchedulingData', () => {
	let loadTrialLessonSchedulingData: typeof import('../../../src/lib/trial-lessons/loadTrialLessonSchedulingData').loadTrialLessonSchedulingData;

	beforeAll(async () => {
		({ loadTrialLessonSchedulingData } = await import(
			'../../../src/lib/trial-lessons/loadTrialLessonSchedulingData'
		));
	});

	beforeEach(() => {
		for (const key of Object.keys(tableResults)) {
			delete tableResults[key];
		}
	});

	it('returns empty scheduling data when no teachers are linked to the lesson type', async () => {
		tableResults.teacher_lesson_types = { data: [], error: null };
		const result = await loadTrialLessonSchedulingData('lt-1', '2026-09-01', '2026-09-30');
		expect(result.teachers.size).toBe(0);
		expect(result.availabilityByTeacher.size).toBe(0);
		expect(result.agreementsByTeacher.size).toBe(0);
		expect(result.trialsByTeacher.size).toBe(0);
	});

	it('loads scheduling data for teachers linked to a lesson type', async () => {
		tableResults.teacher_lesson_types = { data: [{ teacher_user_id: 't-1' }], error: null };
		tableResults.profiles = {
			data: [{ user_id: 't-1', first_name: 'Jan', last_name: 'Docent', avatar_url: null }],
			error: null,
		};
		tableResults.teacher_availability = {
			data: [{ teacher_user_id: 't-1', day_of_week: 1, start_time: '09:00', end_time: '12:00' }],
			error: null,
		};
		tableResults.lesson_agreements = {
			data: [
				{
					teacher_user_id: 't-1',
					day_of_week: 2,
					start_time: '10:00',
					start_date: '2026-01-01',
					end_date: '2027-07-31',
					duration_minutes: 45,
					frequency: 'weekly',
				},
			],
			error: null,
		};
		tableResults.trial_lessons = {
			data: [
				{
					teacher_user_id: 't-1',
					scheduled_date: '2026-09-07',
					scheduled_start_time: '14:00',
					duration_minutes: 30,
					status: 'scheduled',
				},
			],
			error: null,
		};

		const result = await loadTrialLessonSchedulingData('lt-1', '2026-09-01', '2026-09-30');
		expect(result.teachers.get('t-1')).toEqual({
			user_id: 't-1',
			first_name: 'Jan',
			last_name: 'Docent',
			avatar_url: null,
		});
		expect(result.availabilityByTeacher.get('t-1')).toEqual([
			{ day_of_week: 1, start_time: '09:00', end_time: '12:00' },
		]);
		expect(result.agreementsByTeacher.get('t-1')).toEqual([
			{
				day_of_week: 2,
				start_time: '10:00',
				start_date: '2026-01-01',
				end_date: '2027-07-31',
				duration_minutes: 45,
				frequency: 'weekly',
			},
		]);
		expect(result.trialsByTeacher.get('t-1')).toEqual([
			{
				teacher_user_id: 't-1',
				scheduled_date: '2026-09-07',
				scheduled_start_time: '14:00',
				duration_minutes: 30,
			},
		]);
	});

	it('loads active teachers when no lesson type is selected', async () => {
		tableResults.teachers = { data: [{ user_id: 't-2' }], error: null };
		tableResults.profiles = {
			data: [{ user_id: 't-2', first_name: 'Piet', last_name: 'Meester', avatar_url: null }],
			error: null,
		};
		tableResults.teacher_availability = { data: [], error: null };
		tableResults.lesson_agreements = { data: [], error: null };
		tableResults.trial_lessons = { data: [], error: null };

		const result = await loadTrialLessonSchedulingData(null, '2026-09-01', '2026-09-30');
		expect(result.teachers.get('t-2')?.first_name).toBe('Piet');
		expect(result.availabilityByTeacher.size).toBe(0);
	});
});
