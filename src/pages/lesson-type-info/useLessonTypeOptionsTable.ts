import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo } from 'react';
import { createLessonTypeOptionColumns } from '@/pages/lesson-type-info/optionColumns';
import type { OptionRowWithKey } from '@/pages/lesson-type-info/types';
import { optionSort } from '@/pages/lesson-type-info/utils';

interface UseLessonTypeOptionsTableParams {
	optionsForm: OptionRowWithKey[];
	setOptionsForm: Dispatch<SetStateAction<OptionRowWithKey[]>>;
}

export function useLessonTypeOptionsTable({ optionsForm, setOptionsForm }: UseLessonTypeOptionsTableParams) {
	const removeOption = useCallback(
		(index: number) => {
			setOptionsForm((prev) => prev.filter((_, i) => i !== index));
		},
		[setOptionsForm],
	);

	const findOptionIndex = useCallback(
		(opt: OptionRowWithKey) =>
			optionsForm.findIndex((option) => (option.id && option.id === opt.id) || option._newId === opt._newId),
		[optionsForm],
	);

	const sortedOptionsForm = useMemo(() => optionsForm.toSorted(optionSort), [optionsForm]);
	const optionColumns = useMemo(() => createLessonTypeOptionColumns(), []);

	const getOptionRowKey = useCallback(
		(opt: OptionRowWithKey) => opt.id ?? opt._newId ?? `opt-${optionsForm.indexOf(opt)}`,
		[optionsForm],
	);

	return {
		removeOption,
		findOptionIndex,
		sortedOptionsForm,
		optionColumns,
		getOptionRowKey,
	};
}

export function useLessonTypeBreadcrumb(
	isEditMode: boolean,
	lessonTypeName: string | undefined,
	setBreadcrumbSuffix: (items: { label: string }[]) => void,
) {
	useEffect(() => {
		if (!isEditMode || !lessonTypeName) {
			setBreadcrumbSuffix([]);
			return;
		}
		setBreadcrumbSuffix([{ label: lessonTypeName }]);
		return () => setBreadcrumbSuffix([]);
	}, [isEditMode, lessonTypeName, setBreadcrumbSuffix]);
}
