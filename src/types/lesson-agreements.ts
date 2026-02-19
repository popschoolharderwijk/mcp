/**
 * Centralized type definitions for lesson agreements
 * These types extend the generated Supabase types with joined relations
 */

import type { Database } from '@/integrations/supabase/types';

// Base types from Supabase
type LessonAgreementRow = Database['public']['Tables']['lesson_agreements']['Row'];
type LessonTypeRow = Database['public']['Tables']['lesson_types']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type LessonAppointmentDeviationRow = Database['public']['Tables']['lesson_appointment_deviations']['Row'];

/** Lesson scheduling frequency from Supabase enum (use this instead of defining locally) */
export type LessonFrequency = Database['public']['Enums']['lesson_frequency'];

// ======== Wizard Step Types ========

/** Teacher info for wizard steps */
export interface WizardTeacherInfo {
	id: string;
	userId: string;
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	avatarUrl: string | null;
}

/** Lesson type info for wizard steps */
export interface WizardLessonTypeInfo {
	id: string;
	name: string;
	icon: string | null;
	color: string | null;
	frequency: LessonFrequency;
	duration_minutes: number;
}

/** Simplified teacher for wizard confirmation step */
export interface WizardAgreementTeacher {
	first_name: string | null;
	last_name: string | null;
	email: string | null;
	avatar_url: string | null;
}

/** Simplified lesson type for wizard confirmation step */
export interface WizardAgreementLessonType {
	name: string | null;
	frequency?: LessonFrequency;
}

/** Initial agreement data for editing in wizard */
export interface WizardInitialAgreement {
	id: string;
	student_user_id: string;
	teacher_id: string;
	lesson_type_id: string;
	start_date: string;
	end_date: string | null;
	day_of_week: number;
	start_time: string;
	teacher?: WizardAgreementTeacher;
	lesson_type?: WizardAgreementLessonType;
}

// ======== End Wizard Step Types ========

/**
 * Lesson agreement from teacher's perspective (includes student profile)
 */
export type LessonAgreementWithStudent = Pick<
	LessonAgreementRow,
	'id' | 'day_of_week' | 'start_time' | 'start_date' | 'end_date' | 'is_active' | 'student_user_id' | 'lesson_type_id'
> & {
	profiles: Pick<ProfileRow, 'first_name' | 'last_name' | 'email'> | null;
	lesson_types: Pick<
		LessonTypeRow,
		'id' | 'name' | 'icon' | 'color' | 'is_group_lesson' | 'duration_minutes' | 'frequency'
	>;
};

/**
 * Lesson agreement from student's perspective (includes teacher profile)
 */
export type LessonAgreementWithTeacher = Pick<
	LessonAgreementRow,
	'id' | 'day_of_week' | 'start_time' | 'start_date' | 'end_date' | 'is_active' | 'notes'
> & {
	teacher: Pick<ProfileRow, 'first_name' | 'last_name' | 'avatar_url'>;
	lesson_type: Pick<LessonTypeRow, 'id' | 'name' | 'icon' | 'color'>;
};

/**
 * Lesson agreement row for the Agreements data table (includes student profile, teacher profile, lesson type with frequency)
 */
export type AgreementTableRow = Pick<
	LessonAgreementRow,
	| 'id'
	| 'created_at'
	| 'day_of_week'
	| 'start_time'
	| 'start_date'
	| 'end_date'
	| 'is_active'
	| 'notes'
	| 'student_user_id'
	| 'teacher_id'
	| 'lesson_type_id'
> & {
	student: Pick<ProfileRow, 'first_name' | 'last_name' | 'avatar_url' | 'email'>;
	teacher: Pick<ProfileRow, 'first_name' | 'last_name' | 'avatar_url' | 'email'>;
	lesson_type: Pick<LessonTypeRow, 'id' | 'name' | 'icon' | 'color' | 'duration_minutes' | 'frequency'>;
};

/**
 * Lesson appointment deviation with its related lesson agreement
 */
export type LessonAppointmentDeviationWithAgreement = Omit<
	LessonAppointmentDeviationRow,
	'created_at' | 'updated_at' | 'created_by_user_id' | 'last_updated_by_user_id'
> & {
	lesson_agreements: LessonAgreementWithStudent;
};
