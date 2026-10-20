import type { OptionRowWithKey } from '@/pages/lesson-type-info/types';
import { centsToInput } from '@/pages/lesson-type-info/utils';
import type {
	LessonBillingKind,
	LessonTypeFormState,
	LessonTypeOptionRow,
	LessonTypeOptionTariff,
	LessonTypeRow,
} from '@/types/lesson-agreements';

export type LessonTypeOptionWithTariffs = LessonTypeOptionRow & {
	lesson_type_option_tariffs?: LessonTypeOptionTariff[] | null;
};

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

/** Tariffs newest first. */
export function sortTariffsNewestFirst(tariffs: LessonTypeOptionTariff[] | null | undefined): LessonTypeOptionTariff[] {
	return [...(tariffs ?? [])].sort((a, b) => b.effective_from.localeCompare(a.effective_from));
}

/** Form rows prefilled with the newest tariff (editing it with a new date adds a tariff). */
export function mapLessonTypeOptionsToForm(typedOptions: LessonTypeOptionWithTariffs[]): OptionRowWithKey[] {
	return typedOptions.map((option) => {
		const tariffs = sortTariffsNewestFirst(option.lesson_type_option_tariffs);
		const latest = tariffs[0];
		return {
			id: option.id,
			duration_minutes: option.duration_minutes.toString(),
			frequency: option.frequency,
			label: option.label ?? '',
			billing_kind: option.billing_kind as LessonBillingKind,
			has_adult_tariff: option.has_adult_tariff,
			effective_from: latest?.effective_from ?? '',
			amount_under_21: centsToInput(latest?.amount_under_21_cents),
			amount_adult: centsToInput(latest?.amount_adult_cents),
			tariffs,
		};
	});
}

export function resolveLessonTypeLoadFailure(typeError: unknown, typeData: unknown): boolean {
	return Boolean(typeError) || !typeData;
}
