import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
	buildOptionModalFormFromEditing,
	isEditingExistingOption,
	resolveSaveOptionInModalFlow,
	runConfirmRemoveOption,
	runSaveOptionInModal,
} from '@/pages/lesson-type-info/lessonTypeOptionModalHelpers';
import {
	runPersistExistingOptionFlow,
	runPersistNewOptionFlow,
} from '@/pages/lesson-type-info/lessonTypeOptionModalPersistHelpers';
import {
	buildOptionFormRow,
	deletePersistedOption,
	isDuplicateOption,
} from '@/pages/lesson-type-info/lessonTypeOptionPersistence';
import {
	createNewOptionRow,
	emptyOptionModalForm,
	type OptionModalFormState,
	type OptionRowWithKey,
} from '@/pages/lesson-type-info/types';
import { getOptionModalValidationError } from '@/pages/lesson-type-info/validateLessonTypeOption';
import type { LessonTypeOptionRow, LessonTypeRow } from '@/types/lesson-agreements';

interface UseLessonTypeOptionModalParams {
	isEditMode: boolean;
	lessonType: LessonTypeRow | null;
	optionsForm: OptionRowWithKey[];
	setOptionsForm: Dispatch<SetStateAction<OptionRowWithKey[]>>;
	setOptions: Dispatch<SetStateAction<LessonTypeOptionRow[]>>;
	findOptionIndex: (opt: OptionRowWithKey) => number;
	removeOption: (index: number) => void;
	setSaving: (saving: boolean) => void;
}

export function useLessonTypeOptionModal({
	isEditMode,
	lessonType,
	optionsForm,
	setOptionsForm,
	setOptions,
	findOptionIndex,
	removeOption,
	setSaving,
}: UseLessonTypeOptionModalParams) {
	const [editingOption, setEditingOption] = useState<OptionRowWithKey | null>(null);
	const [optionToDelete, setOptionToDelete] = useState<OptionRowWithKey | null>(null);
	const [optionModalForm, setOptionModalForm] = useState<OptionModalFormState>(emptyOptionModalForm);
	const newOptionIdRef = useRef(0);

	useEffect(() => {
		if (!editingOption) return;
		setOptionModalForm(buildOptionModalFormFromEditing(editingOption));
	}, [editingOption]);

	const addOption = useCallback(() => {
		setEditingOption(createNewOptionRow(`new-${++newOptionIdRef.current}`));
	}, []);

	const updateExistingOptionInForm = useCallback(
		(editing: OptionRowWithKey, modalForm: OptionModalFormState) => {
			const index = findOptionIndex(editing);
			if (index < 0) {
				toast.error('Optie niet gevonden');
				return false;
			}

			setOptionsForm((prev) => {
				const next = [...prev];
				next[index] = buildOptionFormRow(editing, modalForm);
				return next;
			});
			return true;
		},
		[findOptionIndex, setOptionsForm],
	);

	const persistExistingOption = useCallback(
		async (editing: OptionRowWithKey, modalForm: OptionModalFormState) =>
			runPersistExistingOptionFlow({
				editing,
				modalForm,
				isEditMode,
				lessonType,
				setOptions,
				setOptionsForm,
				setSaving,
			}),
		[isEditMode, lessonType, setOptions, setOptionsForm, setSaving],
	);

	const persistNewOption = useCallback(
		async (editing: OptionRowWithKey, modalForm: OptionModalFormState) =>
			runPersistNewOptionFlow({
				editing,
				modalForm,
				isEditMode,
				lessonType,
				setOptionsForm,
				setOptions,
				setSaving,
			}),
		[isEditMode, lessonType, setOptions, setOptionsForm, setSaving],
	);

	const saveOptionInModal = useCallback(async () => {
		if (!editingOption) return;

		const flow = resolveSaveOptionInModalFlow({
			editingOption,
			validationError: getOptionModalValidationError(optionModalForm),
			isDuplicate: isDuplicateOption(
				optionsForm,
				optionModalForm,
				editingOption,
				isEditingExistingOption(editingOption),
			),
			isEditExisting: isEditingExistingOption(editingOption),
			isEditMode,
			hasLessonType: Boolean(lessonType),
		});

		await runSaveOptionInModal({
			flow,
			editingOption,
			optionModalForm,
			updateExistingOptionInForm,
			persistExistingOption,
			persistNewOption,
			clearEditingOption: () => setEditingOption(null),
		});
	}, [
		editingOption,
		isEditMode,
		lessonType,
		optionModalForm,
		optionsForm,
		persistExistingOption,
		persistNewOption,
		updateExistingOptionInForm,
	]);

	const confirmRemoveOption = useCallback(async () => {
		await runConfirmRemoveOption({
			optionToDelete,
			findOptionIndex,
			isEditMode,
			hasLessonType: Boolean(lessonType),
			deletePersistedOption,
			removeOption,
			removePersistedOptionFromState: (optionId) =>
				setOptions((prev) => prev.filter((option) => option.id !== optionId)),
			setSaving,
			clearOptionToDelete: () => setOptionToDelete(null),
		});
	}, [findOptionIndex, isEditMode, lessonType, optionToDelete, removeOption, setOptions, setSaving]);

	return {
		editingOption,
		setEditingOption,
		optionToDelete,
		setOptionToDelete,
		optionModalForm,
		setOptionModalForm,
		addOption,
		saveOptionInModal,
		confirmRemoveOption,
	};
}
