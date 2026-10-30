import type { SignupRequestRowCore } from '../_shared/signupRequestRowTypes.ts';

export interface Body {
	signup_request_id?: string | null;
	teacher_user_id: string;
	lesson_type_id?: string | null;
	lesson_type_option_id?: string | null;
	scheduled_date: string;
	scheduled_start_time: string;
	duration_minutes: number;
	notes?: string | null;
	student_email?: string;
	student_first_name?: string;
	student_last_name?: string;
	student_phone_number?: string | null;
	student_date_of_birth?: string | null;
	parent_name?: string | null;
	parent_email?: string | null;
	parent_phone_number?: string | null;
}

export interface ResolvedStudentData {
	studentEmail: string;
	studentFirstName: string;
	studentLastName: string;
	studentPhone: string | null;
	studentDob: string | null;
	parentName: string | null;
	parentEmail: string | null;
	parentPhone: string | null;
	lessonTypeId: string;
	lessonTypeOptionId: string | null;
	signupReq: { id: string; status: string } | null;
}

export type SignupRequestRow = SignupRequestRowCore & {
	lesson_type_id: string;
	lesson_type_option_id: string | null;
};
