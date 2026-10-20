import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import {
	buildOptionFormRow,
	persistExistingOptionUpdate,
	persistNewOptionInsert,
} from '@/pages/lesson-type-info/lessonTypeOptionPersistence';
import type { OptionModalFormState, OptionRowWithKey } from '@/pages/lesson-type-info/types';
import { buildOptionDbPayloadFromForm } from '@/pages/lesson-type-info/utils';
import type { LessonTypeOptionRow, LessonTypeRow } from '@/types/lesson-agreements';

export interface RunPersistExistingOptionFlowParams {
	editing: OptionRowWithKey;
	modalForm: OptionModalFormState;
	isEditMode: boolean;
	lessonType: LessonTypeRow | null;
	setOptions: Dispatch<SetStateAction<LessonTypeOptionRow[]>>;
	setOptionsForm: Dispatch<SetStateAction<OptionRowWithKey[]>>;
	setSaving: (saving: boolean) => void;
}

export async function runPersistExistingOptionFlow(params: RunPersistExistingOptionFlowParams): Promise<boolean> {
	if (!params.isEditMode || !params.lessonType || !params.editing.id) return true;

	params.setSaving(true);
	try {
		const tariff = await persistExistingOptionUpdate(params.editing, params.modalForm);
		if (!tariff) return false;

		const dbPayload = buildOptionDbPayloadFromForm(params.modalForm);
		params.setOptions((prev) =>
			prev.map((option) => (option.id === params.editing.id ? { ...option, ...dbPayload } : option)),
		);
		params.setOptionsForm((prev) =>
			prev.map((row) =>
				row.id === params.editing.id ? buildOptionFormRow(params.editing, params.modalForm, tariff) : row,
			),
		);
		toast.success('Optie bijgewerkt');
		return true;
	} catch (error) {
		console.error(error);
		toast.error('Fout bij opslaan optie');
		return false;
	} finally {
		params.setSaving(false);
	}
}

export interface RunPersistNewOptionFlowParams {
	editing: OptionRowWithKey;
	modalForm: OptionModalFormState;
	isEditMode: boolean;
	lessonType: LessonTypeRow | null;
	setOptionsForm: Dispatch<SetStateAction<OptionRowWithKey[]>>;
	setOptions: Dispatch<SetStateAction<LessonTypeOptionRow[]>>;
	setSaving: (saving: boolean) => void;
}

export async function runPersistNewOptionFlow(params: RunPersistNewOptionFlowParams): Promise<boolean> {
	params.setOptionsForm((prev) => [...prev, buildOptionFormRow(params.editing, params.modalForm)]);

	if (!params.isEditMode || !params.lessonType) {
		toast.success('Optie toegevoegd');
		return true;
	}

	params.setSaving(true);
	try {
		const inserted = await persistNewOptionInsert(params.lessonType, params.modalForm);
		if (!inserted) {
			params.setOptionsForm((prev) => prev.filter((row) => row._newId !== params.editing._newId));
			return false;
		}

		params.setOptions((prev) => [...prev, inserted.option]);
		params.setOptionsForm((prev) =>
			prev.map((row) =>
				row._newId === params.editing._newId
					? {
							...buildOptionFormRow(params.editing, params.modalForm, inserted.tariff),
							id: inserted.option.id,
						}
					: row,
			),
		);
		toast.success('Optie toegevoegd');
		return true;
	} catch (error) {
		console.error(error);
		toast.error('Fout bij opslaan optie');
		params.setOptionsForm((prev) => prev.filter((row) => row._newId !== params.editing._newId));
		return false;
	} finally {
		params.setSaving(false);
	}
}
