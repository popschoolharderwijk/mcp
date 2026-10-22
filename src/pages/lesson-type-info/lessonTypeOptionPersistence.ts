import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DUPLICATE_OPTION_MESSAGE } from '@/pages/lesson-type-info/constants';
import type { OptionModalFormState, OptionRowWithKey } from '@/pages/lesson-type-info/types';
import { buildOptionDbPayloadFromForm } from '@/pages/lesson-type-info/utils';
import type { LessonTypeOptionRow, LessonTypeRow } from '@/types/lesson-agreements';

function isOptionDuplicateCandidate(
	option: OptionRowWithKey,
	modalForm: OptionModalFormState,
	editingOption: OptionRowWithKey,
	isEditExisting: boolean,
): boolean {
	if (option.duration_minutes !== modalForm.duration_minutes) return false;
	if (option.frequency !== modalForm.frequency) return false;
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

export function buildOptionFormRow(
	editingOption: OptionRowWithKey,
	modalForm: OptionModalFormState,
	priceAdult: number,
): OptionRowWithKey {
	return {
		_newId: editingOption._newId,
		id: editingOption.id,
		duration_minutes: modalForm.duration_minutes,
		frequency: modalForm.frequency,
		price_per_lesson: priceAdult.toString(),
		price_per_lesson_youth: modalForm.price_per_lesson_youth,
		price_per_lesson_adult: modalForm.price_per_lesson_adult,
	};
}

export async function persistExistingOptionUpdate(
	editingOption: OptionRowWithKey,
	modalForm: OptionModalFormState,
	priceAdult: number,
): Promise<boolean> {
	if (!editingOption.id) return false;

	const dbPayload = buildOptionDbPayloadFromForm(
		modalForm.duration_minutes,
		modalForm.frequency,
		modalForm.price_per_lesson_youth,
		modalForm.price_per_lesson_adult,
		priceAdult,
	);

	const { error } = await supabase.from('lesson_type_options').update(dbPayload).eq('id', editingOption.id);

	if (error) {
		if (error.code === '23505') {
			toast.error(DUPLICATE_OPTION_MESSAGE);
			return false;
		}
		toast.error('Fout bij bijwerken optie', { description: error.message });
		return false;
	}

	return true;
}

export async function persistNewOptionInsert(
	lessonType: LessonTypeRow,
	modalForm: OptionModalFormState,
	priceAdult: number,
): Promise<LessonTypeOptionRow | null> {
	const dbPayload = buildOptionDbPayloadFromForm(
		modalForm.duration_minutes,
		modalForm.frequency,
		modalForm.price_per_lesson_youth,
		modalForm.price_per_lesson_adult,
		priceAdult,
	);

	const { data: inserted, error } = await supabase
		.from('lesson_type_options')
		.insert({ lesson_type_id: lessonType.id, ...dbPayload })
		.select()
		.single();

	if (error) {
		if (error.code === '23505') {
			toast.error(DUPLICATE_OPTION_MESSAGE);
		} else {
			toast.error('Fout bij opslaan optie', { description: error.message });
		}
		return null;
	}

	return inserted as LessonTypeOptionRow;
}

export async function deletePersistedOption(optionId: string): Promise<boolean> {
	const { error } = await supabase.from('lesson_type_options').delete().eq('id', optionId);
	if (error) {
		toast.error('Fout bij verwijderen optie', { description: error.message });
		return false;
	}
	return true;
}
