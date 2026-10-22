import { describe, expect, it } from 'bun:test';
import {
	buildDuoPairBasePayload,
	buildDuoPairInsertPayload,
	resolveDuoPairInsertFailureMessage,
	resolveDuoPairInsertFailureResponse,
	resolveDuoPairInsertOutcome,
} from '../../../supabase/functions/create-duo-agreements/createDuoPairHelpers';

const body = {
	student_user_id_a: 'student-a',
	student_user_id_b: 'student-b',
	teacher_user_id: 'teacher-1',
	lesson_type_id: 'lesson-type-1',
	day_of_week: 1,
	start_time: '15:00',
	duration_minutes: 45,
	frequency: 'weekly' as const,
	price_per_lesson: 25,
	start_date: '2026-09-01',
	end_date: null,
};

describe('buildDuoPairBasePayload', () => {
	it('builds shared duo pair payload with generated id', () => {
		expect(buildDuoPairBasePayload(body, 'duo-pair-1')).toEqual({
			teacher_user_id: 'teacher-1',
			lesson_type_id: 'lesson-type-1',
			day_of_week: 1,
			start_time: '15:00',
			duration_minutes: 45,
			frequency: 'weekly',
			price_per_lesson: 25,
			start_date: '2026-09-01',
			end_date: null,
			is_active: true,
			duo_pair_id: 'duo-pair-1',
			signup_source: 'staff_duo',
		});
	});
});

describe('buildDuoPairInsertPayload', () => {
	it('adds student user id to base payload', () => {
		const basePayload = buildDuoPairBasePayload(body, 'duo-pair-1');
		expect(buildDuoPairInsertPayload(basePayload, 'student-a').student_user_id).toBe('student-a');
	});
});

describe('resolveDuoPairInsertFailureMessage', () => {
	it('returns fallback message when error is missing', () => {
		expect(resolveDuoPairInsertFailureMessage(null, 'fallback')).toBe('fallback');
	});

	it('returns error message when present', () => {
		expect(resolveDuoPairInsertFailureMessage(new Error('insert failed'), 'fallback')).toBe('insert failed');
	});
});

describe('resolveDuoPairInsertOutcome', () => {
	it('returns success when row exists', () => {
		expect(resolveDuoPairInsertOutcome({ id: 'agr-1' }, null)).toEqual({
			ok: true,
			row: { id: 'agr-1' },
		});
	});

	it('returns failure when row is missing', () => {
		expect(resolveDuoPairInsertOutcome(null, new Error('insert failed'))).toEqual({
			ok: false,
			error: new Error('insert failed'),
		});
	});
});

describe('resolveDuoPairInsertFailureResponse', () => {
	it('builds json error response from fallback message', async () => {
		const response = resolveDuoPairInsertFailureResponse(
			null,
			'fallback',
			(error) => (error instanceof Error ? error.message : 'unknown'),
			(status, body) => new Response(JSON.stringify(body), { status }),
		);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'fallback' });
	});
});
