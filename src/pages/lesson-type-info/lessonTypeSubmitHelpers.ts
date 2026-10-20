import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
	buildLessonTypeOptionRowPayload,
	collectRemovedLessonTypeOptionIds,
	resolveLessonTypeSaveMode,
	shouldSaveOptionTariff,
} from '@/pages/lesson-type-info/lessonTypeSubmitPureHelpers';
import { upsertOptionTariff } from '@/pages/lesson-type-info/lessonTypeOptionPersistence';
import type { OptionRowWithKey } from '@/pages/lesson-type-info/types';
import { optionSort } from '@/pages/lesson-type-info/utils';
import { buildLessonTypePayload } from '@/pages/lesson-type-info/validateLessonTypeForm';
import type { LessonTypeFormState, LessonTypeOptionRow, LessonTypeRow } from '@/types/lesson-agreements';

async function syncLessonTypeOptions(lessonTypeId: string, optionsForm: OptionRowWithKey[]): Promise<void> {
	const sorted = [...optionsForm].sort(optionSort);
	for (const option of sorted) {
		const payload = buildLessonTypeOptionRowPayload(option);

		let optionId = option.id;
		if (optionId) {
			await supabase.from('lesson_type_options').update(payload).eq('id', optionId);
		} else {
			const { data } = await supabase
				.from('lesson_type_options')
				.insert({ lesson_type_id: lessonTypeId, ...payload })
				.select('id')
				.single();
			optionId = data?.id;
		}

		if (optionId && shouldSaveOptionTariff(option)) {
			await upsertOptionTariff(optionId, option);
		}
	}
}

async function deleteRemovedLessonTypeOptions(
	options: LessonTypeOptionRow[],
	optionsForm: OptionRowWithKey[],
): Promise<void> {
	const toDelete = collectRemovedLessonTypeOptionIds(options, optionsForm);
	for (const optionId of toDelete) {
		await supabase.from('lesson_type_options').delete().eq('id', optionId);
	}
}

async function updateExistingLessonTypeRecord(
	lessonTypeId: string,
	typePayload: ReturnType<typeof buildLessonTypePayload>,
): Promise<{ ok: true; lessonTypeId: string } | { ok: false }> {
	const { error } = await supabase.from('lesson_types').update(typePayload).eq('id', lessonTypeId);
	if (error) {
		toast.error('Fout bij bijwerken lessoort', { description: error.message });
		return { ok: false };
	}
	return { ok: true, lessonTypeId };
}

async function insertNewLessonTypeRecord(
	typePayload: ReturnType<typeof buildLessonTypePayload>,
): Promise<{ ok: true; lessonTypeId: string } | { ok: false }> {
	const { data: inserted, error } = await supabase.from('lesson_types').insert(typePayload).select('id').single();
	if (error) {
		toast.error('Fout bij aanmaken lessoort', { description: error.message });
		return { ok: false };
	}
	return { ok: true, lessonTypeId: inserted?.id ?? '' };
}

async function saveLessonTypeRecord(
	isEditMode: boolean,
	lessonType: LessonTypeRow | null,
	form: LessonTypeFormState,
): Promise<{ ok: true; lessonTypeId: string } | { ok: false }> {
	const saveMode = resolveLessonTypeSaveMode(isEditMode, lessonType);
	if (!saveMode) return { ok: false };

	const typePayload = buildLessonTypePayload(form);
	if (saveMode.kind === 'update') {
		return updateExistingLessonTypeRecord(saveMode.lessonTypeId, typePayload);
	}
	return insertNewLessonTypeRecord(typePayload);
}

export async function persistLessonTypeWithOptions(params: {
	isEditMode: boolean;
	lessonType: LessonTypeRow | null;
	form: LessonTypeFormState;
	options: LessonTypeOptionRow[];
	optionsForm: OptionRowWithKey[];
}): Promise<{ ok: true; lessonTypeId: string } | { ok: false }> {
	const saveResult = await saveLessonTypeRecord(params.isEditMode, params.lessonType, params.form);
	if (!saveResult.ok) return saveResult;

	if (params.isEditMode && params.lessonType) {
		await deleteRemovedLessonTypeOptions(params.options, params.optionsForm);
	}

	await syncLessonTypeOptions(saveResult.lessonTypeId, params.optionsForm);
	return saveResult;
}
