import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

const groupRow = {
	name: 'Groep A',
	lesson_type_id: 'lt-1',
	duration_minutes: 45,
	frequency: 'weekly',
	start_date: '2026-09-01',
	end_date: null as string | null,
	teacher_user_id: 'teacher-1',
	day_of_week: 1,
	start_time: '09:00',
};

let groupResult: { data: typeof groupRow | null; error: { message: string } | null } = {
	data: groupRow,
	error: null,
};
let membersResult: { data: { student_user_id: string }[] | null } = {
	data: [{ student_user_id: 'student-1' }, { student_user_id: 'student-2' }],
};

const supabaseMock = {
	from: (table: string) => {
		if (table === 'lesson_groups') {
			return {
				select: () => ({
					eq: () => ({
						single: () => Promise.resolve(groupResult),
					}),
				}),
			};
		}
		if (table === 'lesson_group_members') {
			return {
				select: () => ({
					eq: () => ({
						is: () => Promise.resolve(membersResult),
					}),
				}),
			};
		}
		throw new Error(`Unexpected table ${table}`);
	},
};

mock.module('sonner', () => ({
	toast: { error: () => {} },
}));

mock.module('../../../src/integrations/supabase/client', () => ({
	supabase: supabaseMock,
}));

mock.module('@/integrations/supabase/client', () => ({
	supabase: supabaseMock,
}));

describe('fetchLessonGroupForEdit', () => {
	let fetchLessonGroupForEdit: typeof import('../../../src/components/lesson-groups/wizard/lessonGroupDataLoadHelpers').fetchLessonGroupForEdit;

	beforeAll(async () => {
		({ fetchLessonGroupForEdit } = await import(
			'../../../src/components/lesson-groups/wizard/lessonGroupDataLoadHelpers'
		));
	});

	beforeEach(() => {
		groupResult = { data: groupRow, error: null };
		membersResult = { data: [{ student_user_id: 'student-1' }, { student_user_id: 'student-2' }] };
	});

	it('maps group row and members to edit initial state', async () => {
		const result = await fetchLessonGroupForEdit('group-1', '2027-06-30', () => {});
		expect(result).toEqual({
			name: 'Groep A',
			lessonTypeId: 'lt-1',
			durationMinutes: 45,
			frequency: 'weekly',
			startDate: '2026-09-01',
			endDate: '2027-06-30',
			teacherUserId: 'teacher-1',
			slot: {
				day_of_week: 1,
				start_time: '09:00',
				end_time: '09:00',
				status: 'free',
				occupiedOccurrences: 0,
				totalOccurrences: 0,
			},
			memberIds: ['student-1', 'student-2'],
		});
	});

	it('uses group end date when present', async () => {
		groupResult = { data: { ...groupRow, end_date: '2026-12-31' }, error: null };
		membersResult = { data: [] };
		const result = await fetchLessonGroupForEdit('group-1', '2027-06-30', () => {});
		expect(result?.endDate).toBe('2026-12-31');
	});
});
