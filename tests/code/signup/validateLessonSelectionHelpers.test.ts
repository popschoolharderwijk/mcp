import { describe, expect, it } from 'bun:test';
import {
	validateActiveLessonType,
	validateLessonGroupForSignup,
	validateLessonTypeOptionForSignup,
} from '../../../supabase/functions/submit-signup-request/validateLessonSelectionHelpers';

async function readError(response: Response): Promise<string> {
	const body = (await response.json()) as { error: string };
	return body.error;
}

describe('validateActiveLessonType', () => {
	it('returns null for active lesson types', () => {
		expect(validateActiveLessonType({ is_active: true })).toBeNull();
	});

	it('returns not found for inactive lesson types', async () => {
		const response = validateActiveLessonType({ is_active: false });
		expect(response?.status).toBe(404);
		expect(await readError(response as Response)).toBe('Lessoort niet beschikbaar');
	});
});

describe('validateLessonGroupForSignup', () => {
	it('returns null for active matching groups', () => {
		expect(
			validateLessonGroupForSignup({ id: 'group-1', lesson_type_id: 'lesson-1', is_active: true }, 'lesson-1'),
		).toBeNull();
	});

	it('returns not found for inactive or mismatched groups', async () => {
		const response = validateLessonGroupForSignup(
			{ id: 'group-1', lesson_type_id: 'lesson-2', is_active: true },
			'lesson-1',
		);
		expect(response?.status).toBe(404);
		expect(await readError(response as Response)).toBe('Groep niet beschikbaar');
	});
});

describe('validateLessonTypeOptionForSignup', () => {
	it('rejects options for group lessons', async () => {
		const response = validateLessonTypeOptionForSignup(
			{ is_group_lesson: true },
			{ id: 'opt-1', lesson_type_id: 'lesson-1' },
			'lesson-1',
		);
		expect(response?.status).toBe(400);
		expect(await readError(response as Response)).toBe('Optie niet toegestaan voor groepsles');
	});

	it('returns not found for mismatched options', async () => {
		const response = validateLessonTypeOptionForSignup(
			{ is_group_lesson: false },
			{ id: 'opt-1', lesson_type_id: 'lesson-2' },
			'lesson-1',
		);
		expect(response?.status).toBe(404);
		expect(await readError(response as Response)).toBe('Optie niet beschikbaar');
	});
});
