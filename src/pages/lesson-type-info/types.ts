import { DEFAULT_DURATION_MINUTES } from '@/pages/lesson-type-info/constants';
import type { LessonFrequency, LessonTypeOptionFormRow } from '@/types/lesson-agreements';

export type OptionRowWithKey = LessonTypeOptionFormRow & { _newId?: string };

export interface OptionModalFormState {
	duration_minutes: string;
	frequency: LessonFrequency;
	price_per_lesson_youth: string;
	price_per_lesson_adult: string;
}

export const emptyOptionModalForm: OptionModalFormState = {
	duration_minutes: '',
	frequency: 'weekly',
	price_per_lesson_youth: '',
	price_per_lesson_adult: '',
};

export function createNewOptionRow(newId: string): OptionRowWithKey {
	return {
		_newId: newId,
		duration_minutes: String(DEFAULT_DURATION_MINUTES),
		frequency: 'weekly',
		price_per_lesson: '0',
		price_per_lesson_youth: '',
		price_per_lesson_adult: '',
	};
}
