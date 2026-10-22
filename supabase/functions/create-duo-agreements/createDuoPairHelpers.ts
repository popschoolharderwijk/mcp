import type { Body } from './types.ts';

export interface DuoPairBasePayload {
	teacher_user_id: string;
	lesson_type_id: string;
	day_of_week: number;
	start_time: string;
	duration_minutes: number;
	frequency: Body['frequency'];
	price_per_lesson: number;
	start_date: string;
	end_date: string | null;
	is_active: boolean;
	duo_pair_id: string;
	signup_source: string;
}

export function buildDuoPairBasePayload(body: Body, duoPairId: string): DuoPairBasePayload {
	return {
		teacher_user_id: body.teacher_user_id,
		lesson_type_id: body.lesson_type_id,
		day_of_week: body.day_of_week,
		start_time: body.start_time,
		duration_minutes: body.duration_minutes,
		frequency: body.frequency,
		price_per_lesson: body.price_per_lesson,
		start_date: body.start_date,
		end_date: body.end_date,
		is_active: true,
		duo_pair_id: duoPairId,
		signup_source: body.signup_source ?? 'staff_duo',
	};
}

export function buildDuoPairInsertPayload(basePayload: DuoPairBasePayload, studentUserId: string) {
	return { ...basePayload, student_user_id: studentUserId };
}

export function resolveDuoPairInsertFailureMessage(error: unknown, fallbackMessage: string): string {
	if (error instanceof Error && error.message.length > 0) {
		return error.message;
	}
	return fallbackMessage;
}

export function resolveDuoPairInsertOutcome<T extends { id: string }>(
	row: T | null,
	error: unknown,
): { ok: true; row: T } | { ok: false; error: unknown } {
	if (error || !row) {
		return { ok: false, error };
	}
	return { ok: true, row };
}

export function resolveDuoPairInsertFailureResponse(
	error: unknown,
	fallbackMessage: string,
	getSafeErrorMessage: (error: unknown) => string,
	jsonResponse: (status: number, body: { error: string }) => Response,
): Response {
	return jsonResponse(400, {
		error: getSafeErrorMessage(error ?? new Error(resolveDuoPairInsertFailureMessage(null, fallbackMessage))),
	});
}
