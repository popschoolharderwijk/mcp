import { describe, expect, it } from 'bun:test';
import { validateDuoBody } from '../../../supabase/functions/create-duo-agreements/validation';

const STUDENT_A = '11111111-1111-1111-1111-111111111111';
const STUDENT_B = '22222222-2222-2222-2222-222222222222';
const TEACHER_ID = '33333333-3333-3333-3333-333333333333';
const LESSON_TYPE_ID = '44444444-4444-4444-4444-444444444444';

const validBody = {
	student_user_id_a: STUDENT_A,
	student_user_id_b: STUDENT_B,
	teacher_user_id: TEACHER_ID,
	lesson_type_id: LESSON_TYPE_ID,
	day_of_week: 1,
	start_time: '14:00',
	duration_minutes: 45,
	frequency: 'weekly' as const,
	lesson_type_option_id: '55555555-5555-5555-5555-555555555555',
	start_date: '2026-09-01',
	end_date: null,
};

describe('validateDuoBody', () => {
	it('accepts a valid duo agreement body', () => {
		expect(validateDuoBody(validBody)).toEqual({
			ok: true,
			value: {
				...validBody,
				signup_source: 'staff_duo',
				payment_method: 'stripe',
				date_of_birth_a: null,
				date_of_birth_b: null,
			},
		});
	});

	it('rejects a lesson form id that is not a UUID', () => {
		expect(validateDuoBody({ ...validBody, lesson_type_option_id: 'nope' })).toEqual({
			ok: false,
			error: "'lesson_type_option_id' moet een UUID zijn",
		});
	});

	it('rejects non-object bodies and missing required fields', () => {
		expect(validateDuoBody(null)).toEqual({ ok: false, error: 'Body moet een object zijn' });
		expect(validateDuoBody({ ...validBody, teacher_user_id: undefined })).toEqual({
			ok: false,
			error: "Veld 'teacher_user_id' is verplicht",
		});
	});

	it('rejects invalid UUID fields and identical students', () => {
		expect(validateDuoBody({ ...validBody, lesson_type_id: 'bad' })).toEqual({
			ok: false,
			error: "'lesson_type_id' moet een geldige UUID zijn",
		});
		expect(validateDuoBody({ ...validBody, student_user_id_b: STUDENT_A })).toEqual({
			ok: false,
			error: 'Duo-leerlingen moeten verschillend zijn',
		});
	});

	it('rejects invalid day, time, frequency, and dates', () => {
		expect(validateDuoBody({ ...validBody, day_of_week: 7 })).toEqual({
			ok: false,
			error: "'day_of_week' moet een geheel getal 0-6 zijn",
		});
		expect(validateDuoBody({ ...validBody, start_time: '25:00' })).toEqual({
			ok: false,
			error: "'start_time' moet HH:MM(:SS) formaat hebben",
		});
		expect(validateDuoBody({ ...validBody, frequency: 'daily' })).toEqual({
			ok: false,
			error: "'frequency' moet weekly, biweekly of monthly zijn",
		});
		expect(validateDuoBody({ ...validBody, end_date: '31-12-2026' })).toEqual({
			ok: false,
			error: "'end_date' moet YYYY-MM-DD formaat hebben of null zijn",
		});
	});
});
