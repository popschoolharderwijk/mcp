import { UUID_RE } from '../_shared/http.ts';
import { type Body, DATE_RE, TIME_RE, VALID_FREQUENCIES } from './types.ts';

export function validateDuoBody(body: unknown): { ok: true; value: Body } | { ok: false; error: string } {
	if (typeof body !== 'object' || body === null) return { ok: false, error: 'Body moet een object zijn' };
	const b = body as Record<string, unknown>;
	const required = [
		'student_user_id_a',
		'student_user_id_b',
		'teacher_user_id',
		'lesson_type_id',
		'day_of_week',
		'start_time',
		'duration_minutes',
		'frequency',
		'start_date',
	];
	for (const k of required) {
		if (b[k] === undefined || b[k] === null) return { ok: false, error: `Veld '${k}' is verplicht` };
	}
	const uuidError = validateUuidFields(b);
	if (uuidError) return uuidError;
	if (b.student_user_id_a === b.student_user_id_b) {
		return { ok: false, error: 'Duo-leerlingen moeten verschillend zijn' };
	}
	const dowError = validateDayOfWeek(b.day_of_week);
	if (dowError) return dowError;
	const timeError = validateTimeAndDuration(b);
	if (timeError) return timeError;
	const freqError = validateFrequencyAndPrice(b);
	if (freqError) return freqError;
	const dateError = validateDates(b);
	if (dateError) return dateError;
	return buildValidatedBody(b);
}

function validateUuidFields(b: Record<string, unknown>): { ok: false; error: string } | null {
	for (const k of ['student_user_id_a', 'student_user_id_b', 'teacher_user_id', 'lesson_type_id']) {
		if (typeof b[k] !== 'string' || !UUID_RE.test(b[k] as string)) {
			return { ok: false, error: `'${k}' moet een geldige UUID zijn` };
		}
	}
	return null;
}

function validateDayOfWeek(dow: unknown): { ok: false; error: string } | null {
	if (typeof dow !== 'number' || dow < 0 || dow > 6 || !Number.isInteger(dow)) {
		return { ok: false, error: "'day_of_week' moet een geheel getal 0-6 zijn" };
	}
	return null;
}

function validateTimeAndDuration(b: Record<string, unknown>): { ok: false; error: string } | null {
	if (typeof b.start_time !== 'string' || !TIME_RE.test(b.start_time)) {
		return { ok: false, error: "'start_time' moet HH:MM(:SS) formaat hebben" };
	}
	if (typeof b.duration_minutes !== 'number' || b.duration_minutes <= 0) {
		return { ok: false, error: "'duration_minutes' moet positief zijn" };
	}
	return null;
}

function validateFrequencyAndPrice(b: Record<string, unknown>): { ok: false; error: string } | null {
	if (typeof b.frequency !== 'string' || !VALID_FREQUENCIES.has(b.frequency)) {
		return { ok: false, error: "'frequency' moet weekly, biweekly of monthly zijn" };
	}
	if (b.price_per_lesson != null && (typeof b.price_per_lesson !== 'number' || b.price_per_lesson < 0)) {
		return { ok: false, error: "'price_per_lesson' moet >= 0 zijn" };
	}
	if (
		b.lesson_type_option_id != null &&
		(typeof b.lesson_type_option_id !== 'string' || !UUID_RE.test(b.lesson_type_option_id))
	) {
		return { ok: false, error: "'lesson_type_option_id' moet een UUID zijn" };
	}
	return null;
}

function validateDates(b: Record<string, unknown>): { ok: false; error: string } | null {
	if (typeof b.start_date !== 'string' || !DATE_RE.test(b.start_date)) {
		return { ok: false, error: "'start_date' moet YYYY-MM-DD formaat hebben" };
	}
	if (
		b.end_date !== null &&
		b.end_date !== undefined &&
		(typeof b.end_date !== 'string' || !DATE_RE.test(b.end_date))
	) {
		return { ok: false, error: "'end_date' moet YYYY-MM-DD formaat hebben of null zijn" };
	}
	return null;
}

function buildValidatedBody(b: Record<string, unknown>): { ok: true; value: Body } {
	return {
		ok: true,
		value: {
			student_user_id_a: b.student_user_id_a as string,
			student_user_id_b: b.student_user_id_b as string,
			teacher_user_id: b.teacher_user_id as string,
			lesson_type_id: b.lesson_type_id as string,
			day_of_week: b.day_of_week as number,
			start_time: b.start_time as string,
			duration_minutes: b.duration_minutes as number,
			frequency: b.frequency as Body['frequency'],
			price_per_lesson: typeof b.price_per_lesson === 'number' ? b.price_per_lesson : null,
			lesson_type_option_id: typeof b.lesson_type_option_id === 'string' ? b.lesson_type_option_id : null,
			start_date: b.start_date as string,
			end_date: (b.end_date as string | null | undefined) ?? null,
			signup_source: typeof b.signup_source === 'string' ? (b.signup_source as string) : 'staff_duo',
		},
	};
}
