import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import { applyTeachersPageLoadOutcome } from '../../../src/lib/teachers/teachersPageControllerHelpers';

type RpcResult = { data: unknown; error: { message: string } | null };

let rpcResult: RpcResult = { data: { data: [], total_count: 0 }, error: null };

const supabaseMock = {
	rpc: () => Promise.resolve(rpcResult),
};

mock.module('../../../src/integrations/supabase/client', () => ({
	supabase: supabaseMock,
}));

import type { TeacherWithLessonTypes } from '@/types/teachers';

const paginatedTeacher: TeacherWithLessonTypes = {
	user_id: 'teacher-1',
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
	created_by: null,
	updated_by: null,
	is_active: true,
	bio: null,
	coc_issued_on: null,
	email: 'piet@example.com',
	first_name: 'Piet',
	last_name: 'Docent',
	avatar_url: null,
	phone_number: null,
	lesson_types: [],
};

describe('executeTeachersPageLoad', () => {
	let executeTeachersPageLoad: typeof import('../../../src/lib/teachers/teachersPageControllerHelpers').executeTeachersPageLoad;

	beforeAll(async () => {
		({ executeTeachersPageLoad } = await import('../../../src/lib/teachers/teachersPageControllerHelpers'));
	});

	beforeEach(() => {
		rpcResult = {
			data: {
				data: [
					{
						user_id: 'teacher-1',
						created_at: '2026-01-01T00:00:00Z',
						updated_at: '2026-01-01T00:00:00Z',
						created_by: null,
						updated_by: null,
						is_active: true,
						bio: null,
						coc_issued_on: null,
						profile: {
							user_id: 'teacher-1',
							email: 'piet@example.com',
							first_name: 'Piet',
							last_name: 'Docent',
							avatar_url: null,
							phone_number: null,
						},
						lesson_types: [],
					},
				],
				total_count: 1,
			},
			error: null,
		};
	});

	it('skips loading when the user has no access', async () => {
		const outcome = await executeTeachersPageLoad({
			hasAccess: false,
			limit: 10,
			offset: 0,
			search: null,
			status: 'all',
			lessonTypeId: null,
			sortColumn: null,
			sortDirection: null,
		});
		expect(outcome).toEqual({ kind: 'skipped' });
	});

	it('returns paginated teachers when loading succeeds', async () => {
		const outcome = await executeTeachersPageLoad({
			hasAccess: true,
			limit: 10,
			offset: 0,
			search: null,
			status: 'all',
			lessonTypeId: null,
			sortColumn: null,
			sortDirection: null,
		});
		expect(outcome).toEqual({
			kind: 'success',
			result: {
				teachers: [paginatedTeacher],
				totalCount: 1,
				error: null,
			},
		});
	});

	it('returns an error outcome when the RPC fails', async () => {
		rpcResult = { data: null, error: { message: 'rpc failed' } };
		const outcome = await executeTeachersPageLoad({
			hasAccess: true,
			limit: 10,
			offset: 0,
			search: null,
			status: 'all',
			lessonTypeId: null,
			sortColumn: null,
			sortDirection: null,
		});
		expect(outcome).toEqual({ kind: 'error' });
	});
});

describe('applyTeachersPageLoadOutcome', () => {
	it('updates teachers and total count on success', () => {
		let teachers: TeacherWithLessonTypes[] = [paginatedTeacher];
		let totalCount = 0;
		const shouldStopLoading = applyTeachersPageLoadOutcome(
			{
				kind: 'success',
				result: {
					teachers: [paginatedTeacher],
					totalCount: 3,
					error: null,
				},
			},
			(nextTeachers) => {
				teachers = nextTeachers;
			},
			(count) => {
				totalCount = count;
			},
		);
		expect(shouldStopLoading).toBe(true);
		expect(teachers).toEqual([paginatedTeacher]);
		expect(totalCount).toBe(3);
	});

	it('returns false when loading was skipped', () => {
		const shouldStopLoading = applyTeachersPageLoadOutcome(
			{ kind: 'skipped' },
			() => {},
			() => {},
		);
		expect(shouldStopLoading).toBe(false);
	});
});
