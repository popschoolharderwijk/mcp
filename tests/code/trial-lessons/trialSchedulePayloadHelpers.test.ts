import { describe, expect, it } from 'bun:test';
import {
	buildTrialAgendaEventDescription,
	buildTrialAgendaEventInsertRow,
	buildTrialAgendaEventTitle,
	buildTrialLessonInsertRow,
	normalizeTrialLessonNotes,
} from '../../../supabase/functions/schedule-trial-lesson/trialSchedulePayloadHelpers';
import type { Body } from '../../../supabase/functions/schedule-trial-lesson/types';

const SIGNUP_REQUEST_ID = '11111111-1111-1111-1111-111111111111';
const TEACHER_ID = '22222222-2222-2222-2222-222222222222';
const STUDENT_ID = '33333333-3333-3333-3333-333333333333';
const LESSON_TYPE_ID = '44444444-4444-4444-4444-444444444444';
const LESSON_OPTION_ID = '55555555-5555-5555-5555-555555555555';
const TRIAL_ID = '66666666-6666-6666-6666-666666666666';

const baseBody: Body = {
	signup_request_id: SIGNUP_REQUEST_ID,
	teacher_user_id: TEACHER_ID,
	scheduled_date: '2026-09-01',
	scheduled_start_time: '14:00:00',
	duration_minutes: 45,
	notes: '  Eerste proefles  ',
};

describe('normalizeTrialLessonNotes', () => {
	it('returns null for blank notes', () => {
		expect(normalizeTrialLessonNotes('   ')).toBeNull();
	});

	it('returns trimmed notes when present', () => {
		expect(normalizeTrialLessonNotes('  Hallo  ')).toBe('Hallo');
	});
});

describe('buildTrialLessonInsertRow', () => {
	it('builds the trial lesson insert payload', () => {
		expect(
			buildTrialLessonInsertRow(baseBody, {
				studentUserId: STUDENT_ID,
				lessonTypeId: LESSON_TYPE_ID,
				lessonTypeOptionId: LESSON_OPTION_ID,
			}),
		).toEqual({
			signup_request_id: SIGNUP_REQUEST_ID,
			student_user_id: STUDENT_ID,
			teacher_user_id: TEACHER_ID,
			lesson_type_id: LESSON_TYPE_ID,
			lesson_type_option_id: LESSON_OPTION_ID,
			scheduled_date: '2026-09-01',
			scheduled_start_time: '14:00:00',
			duration_minutes: 45,
			status: 'scheduled',
			notes: 'Eerste proefles',
		});
	});
});

describe('buildTrialAgendaEventTitle', () => {
	it('builds the agenda title from the lesson type name', () => {
		expect(buildTrialAgendaEventTitle('Piano')).toBe('Proefles Piano');
	});
});

describe('buildTrialAgendaEventDescription', () => {
	it('builds the agenda description from student names', () => {
		expect(buildTrialAgendaEventDescription('Anna', 'Bakker')).toBe('Proefles voor Anna Bakker');
	});
});

describe('buildTrialAgendaEventInsertRow', () => {
	it('builds the agenda event insert payload', () => {
		expect(
			buildTrialAgendaEventInsertRow(baseBody, {
				trialId: TRIAL_ID,
				endTime: '14:45:00',
				lessonTypeName: 'Piano',
				lessonTypeColor: '#112233',
				studentFirstName: 'Anna',
				studentLastName: 'Bakker',
			}),
		).toEqual({
			title: 'Proefles Piano',
			description: 'Proefles voor Anna Bakker',
			owner_user_id: TEACHER_ID,
			source_type: 'trial_lesson',
			source_id: TRIAL_ID,
			start_date: '2026-09-01',
			start_time: '14:00:00',
			end_date: '2026-09-01',
			end_time: '14:45:00',
			is_all_day: false,
			recurring: false,
			color: '#112233',
		});
	});
});
