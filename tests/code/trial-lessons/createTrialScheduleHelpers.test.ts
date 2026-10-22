import { describe, expect, it } from 'bun:test';
import {
	buildTrialParticipantRows,
	buildTrialScheduleSuccessResult,
	resolveLessonTypeName,
	resolveTrialLessonTypeMeta,
} from '../../../supabase/functions/schedule-trial-lesson/createTrialScheduleHelpers';

const EVENT_ID = '11111111-1111-1111-1111-111111111111';
const TEACHER_ID = '22222222-2222-2222-2222-222222222222';
const STUDENT_ID = '33333333-3333-3333-3333-333333333333';
const TRIAL_ID = '44444444-4444-4444-4444-444444444444';
const AGENDA_ID = '55555555-5555-5555-5555-555555555555';

describe('buildTrialParticipantRows', () => {
	it('builds teacher and student participant rows', () => {
		expect(buildTrialParticipantRows(EVENT_ID, TEACHER_ID, STUDENT_ID)).toEqual([
			{ event_id: EVENT_ID, user_id: TEACHER_ID },
			{ event_id: EVENT_ID, user_id: STUDENT_ID },
		]);
	});
});

describe('buildTrialScheduleSuccessResult', () => {
	it('builds the trial schedule success payload', () => {
		expect(buildTrialScheduleSuccessResult(TRIAL_ID, AGENDA_ID, 'Piano')).toEqual({
			trialId: TRIAL_ID,
			agendaEventId: AGENDA_ID,
			lessonTypeName: 'Piano',
		});
	});
});

describe('resolveLessonTypeName', () => {
	it('returns an empty string when the lesson type name is missing', () => {
		expect(resolveLessonTypeName(null)).toBe('');
	});

	it('returns the lesson type name when present', () => {
		expect(resolveLessonTypeName('Piano')).toBe('Piano');
	});
});

describe('resolveTrialLessonTypeMeta', () => {
	it('returns defaults when lesson type is missing', () => {
		expect(resolveTrialLessonTypeMeta(null)).toEqual({
			lessonTypeName: '',
			lessonTypeColor: null,
		});
	});

	it('returns lesson type name and color when present', () => {
		expect(resolveTrialLessonTypeMeta({ name: 'Piano', color: '#ff0000' })).toEqual({
			lessonTypeName: 'Piano',
			lessonTypeColor: '#ff0000',
		});
	});
});
