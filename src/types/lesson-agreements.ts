/**
 * Centralized type definitions for lesson agreements
 * These types extend the generated Supabase types with joined relations
 */

import type { Enums, Tables } from '@/integrations/supabase/types';
import type { User } from '@/types/users';

// Base types from Supabase
type LessonAgreementRow = Tables<'lesson_agreements'>;
export type LessonTypeRow = Tables<'lesson_types'>;
export type LessonTypeOptionRow = Tables<'lesson_type_options'>;

/** Lesson scheduling frequency from Supabase enum (use this instead of defining locally) */
export type LessonFrequency = Enums<'lesson_frequency'>;

/** Common lesson type display fields (id, name, icon, color) */
export type LessonTypeDisplayFields = Pick<LessonTypeRow, 'id' | 'name' | 'icon' | 'color'>;

/** Lesson type from join (display fields + is_group_lesson) */
export type LessonTypeJoined = LessonTypeDisplayFields & Pick<LessonTypeRow, 'is_group_lesson'>;

/** Base agreement fields shared by query/with-student types (no profiles, no joins) */
type LessonAgreementBaseFields = Pick<
	LessonAgreementRow,
	| 'id'
	| 'day_of_week'
	| 'start_time'
	| 'start_date'
	| 'end_date'
	| 'is_active'
	| 'student_user_id'
	| 'lesson_type_id'
	| 'duration_minutes'
	| 'frequency'
	| 'price_per_lesson'
	| 'notes'
>;

/** Agreement fields for table display (base + created_at, notes, teacher_user_id) */
type LessonAgreementTableFields = LessonAgreementBaseFields &
	Pick<LessonAgreementRow, 'created_at' | 'notes' | 'payment_method' | 'sepa_mandate_id'> & {
		teacher_user_id: string;
		duo_pair_id?: string | null;
	};

/** Form state for lesson type create/edit (nullable DB fields as string) */
export type LessonTypeFormState = Pick<
	LessonTypeRow,
	'name' | 'icon' | 'color' | 'is_group_lesson' | 'is_duo_lesson' | 'is_active'
> & {
	description: string;
	cost_center: string;
};

/** Form row for editing one lesson_type_option (id optional for new; numeric fields as string for inputs) */
export type LessonTypeOptionFormRow = {
	id?: string;
	duration_minutes: string;
	frequency: LessonFrequency;
	/** Snapshot price (legacy column, kept for backwards compat). */
	price_per_lesson: string;
	/** Per-lesson youth tariff (euros, as string for input). */
	price_per_lesson_youth: string;
	/** Per-lesson adult tariff (euros, as string for input). */
	price_per_lesson_adult: string;
};

/** Lesson type option row (duration/frequency/price) for selects; from Supabase lesson_type_options */
export type LessonTypeOptionSnapshot = Pick<
	LessonTypeOptionRow,
	'id' | 'duration_minutes' | 'frequency' | 'price_per_lesson'
>;

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
	price_per_lesson: number;
}

/** Simplified teacher for wizard confirmation step */
export interface WizardAgreementTeacher {
	first_name: string | null;
	last_name: string | null;
	email: string | null;
	avatar_url: string | null;
}

/** Simplified lesson type for wizard confirmation step (name from type; frequency/price from snapshot) */
export interface WizardAgreementLessonType {
	name: string | null;
	frequency?: LessonFrequency;
	duration_minutes?: number;
	price_per_lesson?: number;
}

/** Initial agreement data for editing in wizard (snapshot fields from agreement) */
export interface WizardInitialAgreement {
	id: string;
	student_user_id: string;
	teacher_user_id: string;
	lesson_type_id: string;
	duration_minutes: number;
	frequency: LessonFrequency;
	price_per_lesson: number;
	start_date: string;
	end_date: string | null;
	day_of_week: number;
	start_time: string;
	teacher?: WizardAgreementTeacher;
	lesson_type?: WizardAgreementLessonType;
}

// ======== End Wizard Step Types ========

/**
 * Raw shape from lesson_agreements select with lesson_types and teachers joins.
 * Used when querying agreements with .select('..., lesson_types(...), teachers(user_id)').
 */
export type LessonAgreementQuery = LessonAgreementBaseFields & {
	lesson_types: LessonTypeJoined | LessonTypeJoined[] | null;
	teachers: { user_id: string } | { user_id: string }[] | null;
};

/**
 * Lesson agreement from teacher's perspective (includes student profile)
 * Duration/frequency/price come from agreement snapshot, not lesson_types.
 */
export type LessonAgreementWithStudent = LessonAgreementBaseFields & {
	profiles: Pick<User, 'first_name' | 'last_name' | 'email'> | null;
	lesson_types: LessonTypeJoined;
};

/** Lesson agreement enriched for agenda calendar (student + teacher profiles). */
export type AgendaLessonAgreement = LessonAgreementWithStudent & {
	teacherUserId?: string;
	teacherProfile?: Pick<User, 'first_name' | 'last_name' | 'email'> | null;
};

/**
 * Lesson agreement from student's perspective (includes teacher profile)
 * Duration/frequency/price come from agreement snapshot.
 */
export type LessonAgreementWithTeacher = Pick<
	LessonAgreementRow,
	| 'id'
	| 'day_of_week'
	| 'start_time'
	| 'start_date'
	| 'end_date'
	| 'is_active'
	| 'notes'
	| 'duration_minutes'
	| 'frequency'
	| 'price_per_lesson'
> & {
	teacher: Pick<User, 'first_name' | 'last_name' | 'avatar_url'>;
	lesson_type: LessonTypeDisplayFields;
};

/**
 * Lesson agreement row for the Agreements data table.
 * lesson_type has name/icon/color from lesson_types; duration/frequency/price from agreement snapshot.
 */
export type AgreementTableRow = LessonAgreementTableFields & {
	student: Pick<User, 'first_name' | 'last_name' | 'avatar_url' | 'email'>;
	teacher: Pick<User, 'first_name' | 'last_name' | 'avatar_url' | 'email'>;
	lesson_type: LessonTypeDisplayFields;
};

/** Nested profile shape from get_lesson_agreements_paginated. */
export type PaginatedAgreementProfile = {
	user_id: string;
	email: string | null;
	first_name: string | null;
	last_name: string | null;
	avatar_url: string | null;
	display_name: string;
};

/** One agreement row from get_lesson_agreements_paginated. */
export type PaginatedAgreementRow = {
	id: string;
	student_user_id: string;
	teacher_user_id: string;
	lesson_type_id: string;
	duration_minutes: number;
	frequency: LessonFrequency;
	price_per_lesson: number;
	duo_pair_id: string | null;
	day_of_week: number;
	start_time: string;
	start_date: string;
	end_date: string | null;
	is_active: boolean;
	notes: string | null;
	created_at: string;
	updated_at: string;
	student: PaginatedAgreementProfile;
	teacher: PaginatedAgreementProfile;
	lesson_type: LessonTypeDisplayFields;
};

/** Raw paginated response from get_lesson_agreements_paginated RPC. */
export interface PaginatedAgreementsResponseRaw {
	data: PaginatedAgreementRow[];
	total_count: number;
	limit: number;
	offset: number;
}
