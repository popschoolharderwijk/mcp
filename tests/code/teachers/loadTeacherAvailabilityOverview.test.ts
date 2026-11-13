import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import {
	applyTeacherAvailabilityLoadOutcome,
	getTeacherAvailabilityOverviewName,
	loadTeacherAvailabilityOverview,
} from '../../../src/lib/teachers/loadTeacherAvailabilityOverview';

type QueryResult = { data: unknown; error: { message: string } | null };

const tableResults: Record<string, QueryResult> = {};

function thenableResult(table: string) {
	const result = tableResults[table] ?? { data: [], error: null };
	const promise = Promise.resolve(result);
	return Object.assign(promise, {
		select: () => thenableResult(table),
		eq: () => thenableResult(table),
		in: () => thenableResult(table),
		order: () => thenableResult(table),
	});
}

mock.module('../../../src/integrations/supabase/client', () => ({
	supabase: {
		from: (table: string) => thenableResult(table),
	},
}));

describe('getTeacherAvailabilityOverviewName', () => {
	it('returns the full name when both names are present', () => {
		expect(
			getTeacherAvailabilityOverviewName({
				user_id: 'teacher-1',
				profile: { first_name: 'Piet', last_name: 'Docent', email: 'piet@example.com' },
			}),
		).toBe('Piet Docent');
	});

	it('returns the email when no names are present', () => {
		expect(
			getTeacherAvailabilityOverviewName({
				user_id: 'teacher-1',
				profile: { first_name: null, last_name: null, email: 'piet@example.com' },
			}),
		).toBe('piet@example.com');
	});
});

describe('applyTeacherAvailabilityLoadOutcome', () => {
	it('returns done data for successful loads', () => {
		expect(
			applyTeacherAvailabilityLoadOutcome({
				kind: 'success',
				data: { teachers: [], availability: [] },
			}),
		).toEqual({ kind: 'done', data: { teachers: [], availability: [] } });
	});

	it('returns an error message for failed loads', () => {
		expect(applyTeacherAvailabilityLoadOutcome({ kind: 'profiles-error' })).toEqual({
			kind: 'error',
			message: 'Fout bij laden profielen',
		});
	});
});

describe('loadTeacherAvailabilityOverview', () => {
	beforeAll(async () => {
		await import('../../../src/lib/teachers/loadTeacherAvailabilityOverview');
	});

	beforeEach(() => {
		for (const key of Object.keys(tableResults)) {
			delete tableResults[key];
		}
	});

	it('returns empty data when no active teachers exist', async () => {
		tableResults.teachers = { data: [], error: null };
		const outcome = await loadTeacherAvailabilityOverview();
		expect(outcome).toEqual({ kind: 'success', data: { teachers: [], availability: [] } });
	});

	it('loads teachers, profiles, and availability together', async () => {
		tableResults.teachers = { data: [{ user_id: 'teacher-1' }], error: null };
		tableResults.profiles = {
			data: [{ user_id: 'teacher-1', first_name: 'Piet', last_name: 'Docent', email: 'piet@example.com' }],
			error: null,
		};
		tableResults.teacher_availability = {
			data: [
				{
					id: 'slot-1',
					teacher_user_id: 'teacher-1',
					day_of_week: 1,
					start_time: '09:00:00',
					end_time: '12:00:00',
					room_id: null,
					created_at: '2026-01-01T00:00:00Z',
					updated_at: '2026-01-01T00:00:00Z',
					created_by: null,
					updated_by: null,
				},
			],
			error: null,
		};

		const outcome = await loadTeacherAvailabilityOverview();
		expect(outcome).toEqual({
			kind: 'success',
			data: {
				teachers: [
					{
						user_id: 'teacher-1',
						profile: { first_name: 'Piet', last_name: 'Docent', email: 'piet@example.com' },
					},
				],
				availability: [
					{
						id: 'slot-1',
						teacher_user_id: 'teacher-1',
						day_of_week: 1,
						start_time: '09:00:00',
						end_time: '12:00:00',
						room_id: null,
						created_at: '2026-01-01T00:00:00Z',
						updated_at: '2026-01-01T00:00:00Z',
						created_by: null,
						updated_by: null,
					},
				],
			},
		});
	});

	it('uses empty profile defaults when a profile is missing', async () => {
		tableResults.teachers = { data: [{ user_id: 'teacher-1' }], error: null };
		tableResults.profiles = { data: [], error: null };
		tableResults.teacher_availability = { data: [], error: null };

		const outcome = await loadTeacherAvailabilityOverview();
		expect(outcome).toEqual({
			kind: 'success',
			data: {
				teachers: [
					{
						user_id: 'teacher-1',
						profile: { first_name: null, last_name: null, email: '' },
					},
				],
				availability: [],
			},
		});
	});
});
