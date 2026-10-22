import type { Body, ResolvedStudentData, SignupRequestRow } from './types.ts';

const ELIGIBLE_SIGNUP_STATUSES = ['pending', 'trial_scheduled'] as const;

export function isSignupRequestEligibleForTrialScheduling(status: string): boolean {
	return ELIGIBLE_SIGNUP_STATUSES.includes(status as (typeof ELIGIBLE_SIGNUP_STATUSES)[number]);
}

export type PartialResolvedStudentData = {
	studentEmail: string | null;
	studentFirstName: string | null;
	studentLastName: string | null;
	studentPhone: string | null;
	studentDob: string | null;
	parentName: string | null;
	parentEmail: string | null;
	parentPhone: string | null;
	lessonTypeId: string | null;
	lessonTypeOptionId: string | null;
	signupReq: null;
};

export function fromSignupRequest(req: SignupRequestRow, body: Body): ResolvedStudentData {
	return {
		studentEmail: req.email,
		studentFirstName: req.first_name,
		studentLastName: req.last_name,
		studentPhone: req.phone_number ?? null,
		studentDob: req.date_of_birth ?? null,
		parentName: req.parent_name ?? null,
		parentEmail: req.parent_email ?? null,
		parentPhone: req.parent_phone_number ?? null,
		lessonTypeId: body.lesson_type_id ?? req.lesson_type_id,
		lessonTypeOptionId: body.lesson_type_option_id ?? req.lesson_type_option_id ?? null,
		signupReq: { id: req.id, status: req.status },
	};
}

export function fromRequestBody(body: Body): PartialResolvedStudentData {
	return {
		studentEmail: body.student_email?.trim().toLowerCase() ?? null,
		studentFirstName: body.student_first_name?.trim() ?? null,
		studentLastName: body.student_last_name?.trim() ?? null,
		studentPhone: body.student_phone_number?.trim() || null,
		studentDob: body.student_date_of_birth || null,
		parentName: body.parent_name?.trim() || null,
		parentEmail: body.parent_email?.trim().toLowerCase() || null,
		parentPhone: body.parent_phone_number?.trim() || null,
		lessonTypeId: body.lesson_type_id ?? null,
		lessonTypeOptionId: body.lesson_type_option_id ?? null,
		signupReq: null,
	};
}
