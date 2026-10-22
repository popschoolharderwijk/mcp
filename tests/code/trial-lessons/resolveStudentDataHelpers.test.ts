import { describe, expect, it } from 'bun:test';
import {
	fromRequestBody,
	fromSignupRequest,
	isSignupRequestEligibleForTrialScheduling,
} from '../../../supabase/functions/schedule-trial-lesson/resolveStudentDataHelpers';
import type { Body, SignupRequestRow } from '../../../supabase/functions/schedule-trial-lesson/types';

const LESSON_TYPE_ID = '11111111-1111-1111-1111-111111111111';
const OPTION_ID = '22222222-2222-2222-2222-222222222222';
const REQUEST_ID = '33333333-3333-3333-3333-333333333333';

const baseBody = {
	teacher_user_id: '44444444-4444-4444-4444-444444444444',
	scheduled_date: '2026-09-01',
	scheduled_start_time: '14:00:00',
	duration_minutes: 30,
} as Body;

describe('isSignupRequestEligibleForTrialScheduling', () => {
	it('allows pending status', () => {
		expect(isSignupRequestEligibleForTrialScheduling('pending')).toBe(true);
	});

	it('allows trial_scheduled status', () => {
		expect(isSignupRequestEligibleForTrialScheduling('trial_scheduled')).toBe(true);
	});

	it('rejects processed status', () => {
		expect(isSignupRequestEligibleForTrialScheduling('approved')).toBe(false);
	});
});

describe('fromSignupRequest', () => {
	it('maps signup request fields and preserves signup metadata', () => {
		expect(
			fromSignupRequest(
				{
					id: REQUEST_ID,
					status: 'pending',
					email: 'anna@example.com',
					first_name: 'Anna',
					last_name: 'Bakker',
					phone_number: '0612345678',
					date_of_birth: '2010-05-01',
					parent_name: 'Ouder',
					parent_email: 'ouder@example.com',
					parent_phone_number: '0687654321',
					lesson_type_id: LESSON_TYPE_ID,
					lesson_type_option_id: OPTION_ID,
				} as SignupRequestRow,
				{ ...baseBody, lesson_type_id: '44444444-4444-4444-4444-444444444444' },
			),
		).toEqual({
			studentEmail: 'anna@example.com',
			studentFirstName: 'Anna',
			studentLastName: 'Bakker',
			studentPhone: '0612345678',
			studentDob: '2010-05-01',
			parentName: 'Ouder',
			parentEmail: 'ouder@example.com',
			parentPhone: '0687654321',
			lessonTypeId: '44444444-4444-4444-4444-444444444444',
			lessonTypeOptionId: OPTION_ID,
			signupReq: { id: REQUEST_ID, status: 'pending' },
		});
	});
});

describe('fromRequestBody', () => {
	it('normalizes direct student fields from the request body', () => {
		expect(
			fromRequestBody({
				...baseBody,
				student_email: ' Anna@Example.com ',
				student_first_name: ' Anna ',
				student_last_name: ' Bakker ',
				student_phone_number: ' 0612345678 ',
				student_date_of_birth: '2010-05-01',
				parent_name: ' Ouder ',
				parent_email: ' Ouder@Example.com ',
				parent_phone_number: ' 0687654321 ',
				lesson_type_id: LESSON_TYPE_ID,
				lesson_type_option_id: OPTION_ID,
			}),
		).toEqual({
			studentEmail: 'anna@example.com',
			studentFirstName: 'Anna',
			studentLastName: 'Bakker',
			studentPhone: '0612345678',
			studentDob: '2010-05-01',
			parentName: 'Ouder',
			parentEmail: 'ouder@example.com',
			parentPhone: '0687654321',
			lessonTypeId: LESSON_TYPE_ID,
			lessonTypeOptionId: OPTION_ID,
			signupReq: null,
		});
	});

	it('returns nulls for missing optional fields', () => {
		expect(fromRequestBody(baseBody)).toEqual({
			studentEmail: null,
			studentFirstName: null,
			studentLastName: null,
			studentPhone: null,
			studentDob: null,
			parentName: null,
			parentEmail: null,
			parentPhone: null,
			lessonTypeId: null,
			lessonTypeOptionId: null,
			signupReq: null,
		});
	});
});
