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
>;

/** Agreement fields for table display (base + created_at, notes, teacher_user_id) */
type LessonAgreementTableFields = LessonAgreementBaseFields &
	Pick<LessonAgreementRow, 'created_at' | 'notes' | 'payment_method' | 'sepa_mandate_id'> &
	Partial<Pick<LessonAgreementRow, 'lesson_type_option_id' | 'minimum_term_end' | 'cancellation_effective_date'>> & {
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

/** How a lesson form is billed: fixed monthly amount or one-off (group courses). */
export type LessonBillingKind = 'monthly' | 'one_off';

/** One stored tariff of a lesson form (amounts in cents, adult incl. 21% VAT). */
export type LessonTypeOptionTariff = Pick<
	Tables<'lesson_type_option_tariffs'>,
	'id' | 'effective_from' | 'amount_under_21_cents' | 'amount_adult_cents'
>;

/**
 * Form row for one lesson form (lesson_type_options) plus the tariff being entered.
 * Amounts in euros as string; saving a new effective date adds a tariff, the history stays.
 */
export type LessonTypeOptionFormRow = {
	id?: string;
	duration_minutes: string;
	frequency: LessonFrequency;
	label: string;
	billing_kind: LessonBillingKind;
	has_adult_tariff: boolean;
	effective_from: string;
	amount_under_21: string;
	amount_adult: string;
	tariffs: LessonTypeOptionTariff[];
};

/** Lesson form for selects (wizard, signup). */
export type LessonTypeOptionSnapshot = Pick<LessonTypeOptionRow, 'id' | 'duration_minutes' | 'frequency' | 'label'> & {
	billing_kind: LessonBillingKind;
};

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
	/** Lesson form whose tariff list determines the fee. */
	lesson_type_option_id: string | null;
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
}

/** Initial agreement data for editing in wizard (snapshot fields from agreement) */
export interface WizardInitialAgreement {
	id: string;
	student_user_id: string;
	teacher_user_id: string;
	lesson_type_id: string;
	duration_minutes: number;
	frequency: LessonFrequency;
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
	teachers: { user_id: string }[] | null;
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
