import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import { syncStripeCatalog } from '@/lib/billing/syncStripeCatalog';
import {
	buildOptionFormRow,
	persistExistingOptionUpdate,
	persistNewOptionInsert,
} from '@/pages/lesson-type-info/lessonTypeOptionPersistence';
import type { OptionModalFormState, OptionRowWithKey } from '@/pages/lesson-type-info/types';
import type { LessonTypeOptionRow, LessonTypeRow } from '@/types/lesson-agreements';

export interface RunPersistExistingOptionFlowParams {
	editing: OptionRowWithKey;
	modalForm: OptionModalFormState;
	priceAdult: number;
	isEditMode: boolean;
	lessonType: LessonTypeRow | null;
	setOptions: Dispatch<SetStateAction<LessonTypeOptionRow[]>>;
	setSaving: (saving: boolean) => void;
}

export async function runPersistExistingOptionFlow(params: RunPersistExistingOptionFlowParams): Promise<boolean> {
	if (!params.isEditMode || !params.lessonType || !params.editing.id) return true;

	params.setSaving(true);
	try {
		const ok = await persistExistingOptionUpdate(params.editing, params.modalForm, params.priceAdult);
		if (!ok) return false;

		const dbPayload = {
			duration_minutes: parseInt(params.modalForm.duration_minutes, 10),
			frequency: params.modalForm.frequency,
			price_per_lesson: params.priceAdult,
		};
		params.setOptions((prev) =>
			prev.map((option) => (option.id === params.editing.id ? { ...option, ...dbPayload } : option)),
		);
		toast.success('Optie bijgewerkt');
		void syncStripeCatalog({
			lessonTypeId: params.lessonType.id,
			lessonTypeOptionId: params.editing.id,
			rebuild: true,
			quiet: true,
		});
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
	priceAdult: number;
	isEditMode: boolean;
	lessonType: LessonTypeRow | null;
	setOptionsForm: Dispatch<SetStateAction<OptionRowWithKey[]>>;
	setOptions: Dispatch<SetStateAction<LessonTypeOptionRow[]>>;
	setSaving: (saving: boolean) => void;
}

export async function runPersistNewOptionFlow(params: RunPersistNewOptionFlowParams): Promise<boolean> {
	params.setOptionsForm((prev) => [...prev, buildOptionFormRow(params.editing, params.modalForm, params.priceAdult)]);

	if (!params.isEditMode || !params.lessonType) {
		toast.success('Optie toegevoegd');
		return true;
	}

	params.setSaving(true);
	try {
		const inserted = await persistNewOptionInsert(params.lessonType, params.modalForm, params.priceAdult);
		if (!inserted) {
			params.setOptionsForm((prev) => prev.filter((row) => row._newId !== params.editing._newId));
			return false;
		}

		params.setOptions((prev) => [...prev, inserted]);
		params.setOptionsForm((prev) => {
			const next = [...prev];
			const lastIndex = next.length - 1;
			next[lastIndex] = { ...next[lastIndex], id: inserted.id };
			return next;
		});
		toast.success('Optie toegevoegd');
		void syncStripeCatalog({
			lessonTypeId: params.lessonType.id,
			lessonTypeOptionId: inserted.id,
			rebuild: false,
			quiet: true,
		});
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
