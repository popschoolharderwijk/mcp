export interface Body {
	student_user_id_a: string;
	student_user_id_b: string;
	teacher_user_id: string;
	lesson_type_id: string;
	day_of_week: number;
	start_time: string;
	duration_minutes: number;
	frequency: 'weekly' | 'biweekly' | 'monthly';
	price_per_lesson: number;
	start_date: string;
	end_date: string | null;
	signup_source?: string | null;
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
export const STRIPE_PAYMENT_METHOD_LABEL = 'Automatische incasso via Stripe';

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const VALID_FREQUENCIES = new Set(['weekly', 'biweekly', 'monthly']);
