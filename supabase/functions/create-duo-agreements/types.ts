export interface Body {
	student_user_id_a: string;
	student_user_id_b: string;
	teacher_user_id: string;
	lesson_type_id: string;
	day_of_week: number;
	start_time: string;
	duration_minutes: number;
	frequency: 'weekly' | 'biweekly' | 'monthly';
	lesson_type_option_id: string | null;
	start_date: string;
	end_date: string | null;
	signup_source?: string | null;
	date_of_birth_a?: string | null;
	date_of_birth_b?: string | null;
	payment_method?: 'stripe' | 'manual';
}

export interface LessonTypeRow {
	id: string;
	is_duo_lesson: boolean;
	is_group_lesson: boolean;
	is_active: boolean;
}

export const DAY_NAMES_NL = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
export const FREQUENCY_LABELS: Record<string, string> = {
	weekly: 'wekelijks',
	biweekly: 'om de week',
	monthly: 'maandelijks',
};
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
	stripe: 'Automatische incasso via Stripe',
	sepa: 'SEPA-incasso',
	manual: 'Handmatige facturatie',
};

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const VALID_FREQUENCIES = new Set(['weekly', 'biweekly', 'monthly']);
