import type { LessonTypeRow } from './types.ts';
import { bad } from './validation.ts';

export interface LessonGroupValidationRow {
	id: string;
	lesson_type_id: string;
	is_active: boolean;
}

export interface LessonTypeOptionValidationRow {
	id: string;
	lesson_type_id: string;
}

export function validateActiveLessonType(
	lessonType: Pick<LessonTypeRow, 'is_active'> | null | undefined,
): Response | null {
	if (!lessonType?.is_active) return bad('Lessoort niet beschikbaar', 404);
	return null;
}

export function validateLessonGroupForSignup(
	group: LessonGroupValidationRow | null | undefined,
	lessonTypeId: string,
): Response | null {
	if (!group?.is_active || group.lesson_type_id !== lessonTypeId) {
		return bad('Groep niet beschikbaar', 404);
	}
	return null;
}

export function validateLessonTypeOptionForSignup(
	lessonType: Pick<LessonTypeRow, 'is_group_lesson'>,
	option: LessonTypeOptionValidationRow | null | undefined,
	lessonTypeId: string,
): Response | null {
	if (lessonType.is_group_lesson) return bad('Optie niet toegestaan voor groepsles', 400);
	if (!option || option.lesson_type_id !== lessonTypeId) return bad('Optie niet beschikbaar', 404);
	return null;
}
