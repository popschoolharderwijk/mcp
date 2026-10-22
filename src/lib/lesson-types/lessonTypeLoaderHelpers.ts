import type { OptionRowWithKey } from '@/pages/lesson-type-info/types';
import { centsToInput } from '@/pages/lesson-type-info/utils';
import type { LessonTypeFormState, LessonTypeOptionRow, LessonTypeRow } from '@/types/lesson-agreements';

export function shouldSkipLessonTypeLoad(id: string | undefined): boolean {
	return !id || id === 'new';
}

export function mapLessonTypeRowToForm(typeData: LessonTypeRow): LessonTypeFormState {
	return {
		name: typeData.name,
		description: typeData.description ?? '',
		icon: typeData.icon,
		color: typeData.color,
		cost_center: typeData.cost_center ?? '',
		is_group_lesson: typeData.is_group_lesson,
		is_duo_lesson: typeData.is_duo_lesson ?? false,
		is_active: typeData.is_active,
	};
}

export function mapLessonTypeOptionsToForm(typedOptions: LessonTypeOptionRow[]): OptionRowWithKey[] {
	return typedOptions.map((option) => ({
		id: option.id,
		duration_minutes: option.duration_minutes.toString(),
		frequency: option.frequency,
		price_per_lesson: option.price_per_lesson.toString(),
		price_per_lesson_youth: centsToInput(option.price_per_lesson_youth_cents),
		price_per_lesson_adult: centsToInput(option.price_per_lesson_adult_cents),
	}));
}

export function resolveLessonTypeLoadFailure(typeError: unknown, typeData: unknown): boolean {
	return Boolean(typeError) || !typeData;
}
