import { describe, expect, it } from 'bun:test';
import { buildScheduleTrialLessonSuccessPayload } from '../../../supabase/functions/schedule-trial-lesson/scheduleTrialLessonHelpers';

const TRIAL_ID = '11111111-1111-1111-1111-111111111111';
const STUDENT_ID = '22222222-2222-2222-2222-222222222222';
const AGENDA_ID = '33333333-3333-3333-3333-333333333333';

describe('buildScheduleTrialLessonSuccessPayload', () => {
	it('builds the schedule trial lesson success payload', () => {
		expect(
			buildScheduleTrialLessonSuccessPayload({
				trialId: TRIAL_ID,
				studentUserId: STUDENT_ID,
				agendaEventId: AGENDA_ID,
			}),
		).toEqual({
			trial_id: TRIAL_ID,
			student_user_id: STUDENT_ID,
			agenda_event_id: AGENDA_ID,
		});
	});
});
