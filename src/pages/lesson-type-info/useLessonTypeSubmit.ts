import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { persistLessonTypeWithOptions } from '@/pages/lesson-type-info/lessonTypeSubmit';
import {
	resolveLessonTypeCanSubmit,
	resolveLessonTypeSubmitLabels,
} from '@/pages/lesson-type-info/lessonTypeSubmitHelpers';
import type { OptionRowWithKey } from '@/pages/lesson-type-info/types';
import { getLessonTypeFormValidationError } from '@/pages/lesson-type-info/validateLessonTypeForm';
import type { LessonTypeFormState, LessonTypeOptionRow, LessonTypeRow } from '@/types/lesson-agreements';

interface UseLessonTypeSubmitParams {
	isEditMode: boolean;
	lessonType: LessonTypeRow | null;
	form: LessonTypeFormState;
	optionsForm: OptionRowWithKey[];
	options: LessonTypeOptionRow[];
	setSaving: (saving: boolean) => void;
	saving: boolean;
}

export function useLessonTypeSubmit({
	isEditMode,
	lessonType,
	form,
	optionsForm,
	options,
	setSaving,
	saving,
}: UseLessonTypeSubmitParams) {
	const navigate = useNavigate();
	const labels = resolveLessonTypeSubmitLabels(isEditMode);

	const handleSubmit = useCallback(async () => {
		const validationError = getLessonTypeFormValidationError(form, optionsForm);
		if (validationError) {
			toast.error(validationError);
			return;
		}

		setSaving(true);
		try {
			const saveResult = await persistLessonTypeWithOptions({
				isEditMode,
				lessonType,
				form,
				options,
				optionsForm,
			});
			if (!saveResult.ok) return;

			toast.success(labels.successMessage);
			navigate('/lesson-types');
		} catch (error) {
			console.error('Error saving lesson type:', error);
			toast.error('Fout bij opslaan lessoort', { description: 'Er is een onbekende fout opgetreden.' });
		} finally {
			setSaving(false);
		}
	}, [form, isEditMode, labels.successMessage, lessonType, navigate, options, optionsForm, setSaving]);

	const canSubmit = resolveLessonTypeCanSubmit(form, optionsForm, saving);

	return {
		handleSubmit,
		canSubmit,
		submitLabel: labels.submitLabel,
		savingLabel: labels.savingLabel,
	};
}
