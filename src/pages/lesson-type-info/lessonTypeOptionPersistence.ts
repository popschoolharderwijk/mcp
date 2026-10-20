import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DUPLICATE_OPTION_MESSAGE } from '@/pages/lesson-type-info/constants';
import type { OptionModalFormState, OptionRowWithKey } from '@/pages/lesson-type-info/types';
import { buildOptionDbPayloadFromForm, buildTariffPayloadFromForm } from '@/pages/lesson-type-info/utils';
import type { LessonTypeOptionRow, LessonTypeOptionTariff, LessonTypeRow } from '@/types/lesson-agreements';

function isOptionDuplicateCandidate(
	option: OptionRowWithKey,
	modalForm: OptionModalFormState,
	editingOption: OptionRowWithKey,
	isEditExisting: boolean,
): boolean {
	if (option.duration_minutes !== modalForm.duration_minutes) return false;
	if (option.frequency !== modalForm.frequency) return false;
	if (option.label.trim() !== modalForm.label.trim()) return false;
	if (!isEditExisting) return true;
	return option.id !== editingOption.id && option._newId !== editingOption._newId;
}

export function isDuplicateOption(
	optionsForm: OptionRowWithKey[],
	modalForm: OptionModalFormState,
	editingOption: OptionRowWithKey,
	isEditExisting: boolean,
): boolean {
	return optionsForm.some((option) => isOptionDuplicateCandidate(option, modalForm, editingOption, isEditExisting));
}

/** Merge a saved tariff into the history (same effective date replaces), newest first. */
export function mergeTariffIntoHistory(
	tariffs: LessonTypeOptionTariff[],
	tariff: LessonTypeOptionTariff,
): LessonTypeOptionTariff[] {
	return [...tariffs.filter((t) => t.effective_from !== tariff.effective_from), tariff].sort((a, b) =>
		b.effective_from.localeCompare(a.effective_from),
	);
}

export function buildOptionFormRow(
	editingOption: OptionRowWithKey,
	modalForm: OptionModalFormState,
	savedTariff?: LessonTypeOptionTariff,
): OptionRowWithKey {
	const tariffs = savedTariff ? mergeTariffIntoHistory(editingOption.tariffs, savedTariff) : editingOption.tariffs;
	return {
		...modalForm,
		_newId: editingOption._newId,
		id: editingOption.id,
		tariffs,
	};
}

function toastOptionError(error: { code?: string; message: string }, fallback: string): void {
	if (error.code === '23505') {
		toast.error(DUPLICATE_OPTION_MESSAGE);
		return;
	}
	toast.error(fallback, { description: error.message });
}

/** Insert or replace the tariff of one lesson form for the form's effective date. */
export async function upsertOptionTariff(
	optionId: string,
	modalForm: OptionModalFormState,
): Promise<LessonTypeOptionTariff | null> {
	const { data, error } = await supabase
		.from('lesson_type_option_tariffs')
		.upsert(
			{ lesson_type_option_id: optionId, ...buildTariffPayloadFromForm(modalForm) },
			{ onConflict: 'lesson_type_option_id,effective_from' },
		)
		.select('id, effective_from, amount_under_21_cents, amount_adult_cents')
		.single();
	if (error) {
		toast.error('Fout bij opslaan tarief', { description: error.message });
		return null;
	}
	return data;
}

export async function persistExistingOptionUpdate(
	editingOption: OptionRowWithKey,
	modalForm: OptionModalFormState,
): Promise<LessonTypeOptionTariff | null> {
	if (!editingOption.id) return null;

	const { error } = await supabase
		.from('lesson_type_options')
		.update(buildOptionDbPayloadFromForm(modalForm))
		.eq('id', editingOption.id);

	if (error) {
		toastOptionError(error, 'Fout bij bijwerken optie');
		return null;
	}

	return upsertOptionTariff(editingOption.id, modalForm);
}

export async function persistNewOptionInsert(
	lessonType: LessonTypeRow,
	modalForm: OptionModalFormState,
): Promise<{ option: LessonTypeOptionRow; tariff: LessonTypeOptionTariff } | null> {
	const { data: inserted, error } = await supabase
		.from('lesson_type_options')
		.insert({ lesson_type_id: lessonType.id, ...buildOptionDbPayloadFromForm(modalForm) })
		.select()
		.single();

	if (error) {
		toastOptionError(error, 'Fout bij opslaan optie');
		return null;
	}

	const tariff = await upsertOptionTariff(inserted.id, modalForm);
	if (!tariff) return null;
	return { option: inserted as LessonTypeOptionRow, tariff };
}

export async function deletePersistedOption(optionId: string): Promise<boolean> {
	const { error } = await supabase.from('lesson_type_options').delete().eq('id', optionId);
	if (error) {
		const inUse = error.code === '23503';
		toast.error(inUse ? 'Deze lesvorm wordt gebruikt in overeenkomsten' : 'Fout bij verwijderen optie', {
			description: inUse ? undefined : error.message,
		});
		return false;
	}
	return true;
}
