import type { OptionModalFormState } from '@/pages/lesson-type-info/types';
import type { LessonFrequency } from '@/types/lesson-agreements';

export function updateOptionModalDuration(prev: OptionModalFormState, durationMinutes: string): OptionModalFormState {
	return { ...prev, duration_minutes: durationMinutes };
}

export function updateOptionModalFrequency(
	prev: OptionModalFormState,
	frequency: LessonFrequency,
): OptionModalFormState {
	return { ...prev, frequency };
}

export function updateOptionModalPriceYouth(prev: OptionModalFormState, value: string): OptionModalFormState {
	return { ...prev, price_per_lesson_youth: value };
}

export function updateOptionModalPriceAdult(prev: OptionModalFormState, value: string): OptionModalFormState {
	return { ...prev, price_per_lesson_adult: value };
}
