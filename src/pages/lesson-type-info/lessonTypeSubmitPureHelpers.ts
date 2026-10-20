import type { OptionRowWithKey } from '@/pages/lesson-type-info/types';
import { buildOptionDbPayloadFromForm } from '@/pages/lesson-type-info/utils';
import type { LessonTypeFormState, LessonTypeOptionRow, LessonTypeRow } from '@/types/lesson-agreements';

export type LessonTypeSaveMode = { kind: 'update'; lessonTypeId: string } | { kind: 'create' };

export function resolveLessonTypeSaveMode(
	isEditMode: boolean,
	lessonType: LessonTypeRow | null,
): LessonTypeSaveMode | null {
	if (isEditMode && lessonType) {
		return { kind: 'update', lessonTypeId: lessonType.id };
	}
	if (!isEditMode) {
		return { kind: 'create' };
	}
	return null;
}

export function buildLessonTypeOptionRowPayload(option: OptionRowWithKey) {
	return buildOptionDbPayloadFromForm(option);
}

/** Only options whose tariff fields are filled get a tariff row on save. */
export function shouldSaveOptionTariff(option: OptionRowWithKey): boolean {
	return Boolean(option.effective_from) && (Boolean(option.amount_under_21) || Boolean(option.amount_adult));
}

export function collectRemovedLessonTypeOptionIds(
	options: LessonTypeOptionRow[],
	optionsForm: OptionRowWithKey[],
): string[] {
	const existingIds = new Set(optionsForm.filter((option) => option.id).map((option) => option.id as string));
	return options.filter((option) => !existingIds.has(option.id)).map((option) => option.id);
}

export function resolveLessonTypeCanSubmit(
	form: LessonTypeFormState,
	optionsForm: OptionRowWithKey[],
	saving: boolean,
): boolean {
	return !!form.name.trim() && !!form.icon.trim() && !!form.color.trim() && optionsForm.length > 0 && !saving;
}

export function resolveLessonTypeSubmitLabels(isEditMode: boolean): {
	submitLabel: string;
	savingLabel: string;
	successMessage: string;
} {
	if (isEditMode) {
		return {
			submitLabel: 'Opslaan',
			savingLabel: 'Opslaan...',
			successMessage: 'Lessoort bijgewerkt',
		};
	}
	return {
		submitLabel: 'Toevoegen',
		savingLabel: 'Toevoegen...',
		successMessage: 'Lessoort aangemaakt',
	};
}
