import { describe, expect, it } from 'bun:test';
import { computeGroupMemberSyncPlan } from '../../../src/components/lesson-groups/wizard/lessonGroupMemberSyncPlan';
import {
	buildLessonGroupDbPayload,
	normalizeLessonGroupStartTime,
	scheduleLessonGroupInAgenda,
} from '../../../src/components/lesson-groups/wizard/lessonGroupSaveHelpers';

describe('normalizeLessonGroupStartTime', () => {
	it('adds seconds when missing', () => {
		expect(normalizeLessonGroupStartTime('1430')).toBe('1430:00');
	});

	it('keeps existing time format unchanged', () => {
		expect(normalizeLessonGroupStartTime('14:30:00')).toBe('14:30:00');
	});
});

describe('scheduleLessonGroupInAgenda', () => {
	it('computes first occurrence date and end time from start time and duration', async () => {
		let insertedPayload!: Record<string, unknown>;
		const supabase = {
			from: () => ({
				insert: async (payload: Record<string, unknown>) => {
					insertedPayload = payload;
					return { error: null };
				},
			}),
		} as never;

		await scheduleLessonGroupInAgenda(
			supabase,
			'group-1',
			{
				name: 'Groep A',
				lessonTypeId: 'lt-1',
				teacherUserId: 'teacher-1',
				durationMinutes: 45,
				frequency: 'weekly',
				startDate: '2026-09-01',
				endDate: '2026-12-31',
				slot: null,
				memberIds: [],
				selectedRequestIds: [],
				scheduleInAgenda: true,
			},
			{
				day_of_week: 1,
				start_time: '14:30:00',
				end_time: '18:00:00',
				status: 'free',
				totalOccurrences: 10,
				occupiedOccurrences: 0,
			},
			'14:30:00',
			'teacher-1',
		);

		expect(insertedPayload).toEqual({
			source_type: 'lesson_group',
			source_id: 'group-1',
			owner_user_id: 'teacher-1',
			title: 'Groep A',
			start_date: '2026-09-07',
			start_time: '14:30:00',
			end_date: '2026-09-07',
			end_time: '15:15:00',
			is_all_day: false,
			recurring: true,
			recurring_frequency: 'weekly',
			recurring_end_date: '2026-12-31',
		});
	});
});

describe('computeGroupMemberSyncPlan', () => {
	it('computes members to add and remove', () => {
		expect(
			computeGroupMemberSyncPlan(
				[
					{ id: 'member-1', student_user_id: 'student-1' },
					{ id: 'member-2', student_user_id: 'student-2' },
				],
				['student-2', 'student-3'],
			),
		).toEqual({
			toAdd: ['student-3'],
			toRemoveIds: ['member-1'],
		});
	});
});

describe('buildLessonGroupDbPayload', () => {
	it('builds the database payload from form and slot', () => {
		expect(
			buildLessonGroupDbPayload(
				{
					name: 'Groep A',
					lessonTypeId: 'lt-1',
					teacherUserId: 'teacher-1',
					durationMinutes: 45,
					frequency: 'weekly',
					startDate: '2026-09-01',
					endDate: '',
					slot: null,
					memberIds: [],
					selectedRequestIds: [],
					scheduleInAgenda: false,
				},
				{
					day_of_week: 1,
					start_time: '14:30:00',
					end_time: '15:15:00',
					status: 'free',
					totalOccurrences: 10,
					occupiedOccurrences: 0,
				},
				'14:30:00',
			),
		).toEqual({
			name: 'Groep A',
			lesson_type_id: 'lt-1',
			teacher_user_id: 'teacher-1',
			duration_minutes: 45,
			frequency: 'weekly',
			day_of_week: 1,
			start_time: '14:30:00',
			start_date: '2026-09-01',
			end_date: null,
			is_active: true,
		});
	});
});
