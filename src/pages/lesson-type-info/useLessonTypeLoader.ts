import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
	type LessonTypeOptionWithTariffs,
	mapLessonTypeOptionsToForm,
	mapLessonTypeRowToForm,
	resolveLessonTypeLoadFailure,
	shouldSkipLessonTypeLoad,
} from '@/lib/lesson-types/lessonTypeLoaderHelpers';
import { emptyLessonTypeForm } from '@/pages/lesson-type-info/constants';
import type { OptionRowWithKey } from '@/pages/lesson-type-info/types';
import type { LessonTypeFormState, LessonTypeOptionRow, LessonTypeRow } from '@/types/lesson-agreements';

interface UseLessonTypeLoaderParams {
	id: string | undefined;
	isEditMode: boolean;
	authLoading: boolean;
}

export function useLessonTypeLoader({ id, isEditMode, authLoading }: UseLessonTypeLoaderParams) {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(isEditMode);
	const [lessonType, setLessonType] = useState<LessonTypeRow | null>(null);
	const [options, setOptions] = useState<LessonTypeOptionRow[]>([]);
	const [form, setForm] = useState<LessonTypeFormState>(emptyLessonTypeForm);
	const [optionsForm, setOptionsForm] = useState<OptionRowWithKey[]>([]);

	const loadLessonType = useCallback(async () => {
		if (shouldSkipLessonTypeLoad(id)) return;

		setLoading(true);
		const { data: typeData, error: typeError } = await supabase
			.from('lesson_types')
			.select('*')
			.eq('id', id as string)
			.single();

		if (resolveLessonTypeLoadFailure(typeError, typeData)) {
			setLoading(false);
			toast.error('Lessoort niet gevonden');
			navigate('/lesson-types', { replace: true });
			return;
		}

		const { data: optionsData } = await supabase
			.from('lesson_type_options')
			.select('*, lesson_type_option_tariffs(id, effective_from, amount_under_21_cents, amount_adult_cents)')
			.eq('lesson_type_id', id as string)
			.order('duration_minutes')
			.order('frequency');

		const typedOptions = (optionsData as LessonTypeOptionWithTariffs[]) ?? [];

		setLessonType(typeData as LessonTypeRow);
		setForm(mapLessonTypeRowToForm(typeData as LessonTypeRow));
		setOptions(typedOptions);
		setOptionsForm(mapLessonTypeOptionsToForm(typedOptions));
		setLoading(false);
	}, [id, navigate]);

	useEffect(() => {
		if (authLoading) return;
		if (isEditMode) {
			void loadLessonType();
			return;
		}
		setForm(emptyLessonTypeForm);
		setOptions([]);
		setOptionsForm([]);
	}, [authLoading, isEditMode, loadLessonType]);

	return {
		loading,
		lessonType,
		options,
		setOptions,
		form,
		setForm,
		optionsForm,
		setOptionsForm,
	};
}
