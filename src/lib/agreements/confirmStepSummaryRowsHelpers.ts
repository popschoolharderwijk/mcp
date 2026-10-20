import type { WizardLessonTypeInfo } from '@/types/lesson-agreements';

export interface ConfirmLessonTypeRowValues {
	lessonTypeName: string | null | undefined;
	frequency: WizardLessonTypeInfo['frequency'] | undefined;
	durationMinutes: number | null | undefined;
}

export function mapConfirmSelectedLessonTypeValues(
	lessonType: WizardLessonTypeInfo | undefined,
): ConfirmLessonTypeRowValues {
	return {
		lessonTypeName: lessonType?.name,
		frequency: lessonType?.frequency,
		durationMinutes: lessonType?.duration_minutes,
	};
}
