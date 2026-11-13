import { useMemo } from 'react';
import type { WizardStep } from '@/components/agreements/WizardStepIndicator';
import { useWizardTeacherSlots } from '@/components/agreements/wizard/wizardDataHooks';
import {
	buildEffectiveSlot,
	buildSelectedLessonType,
	buildSelectedTeacher,
	canProceedFromStep,
	computeHasChanges,
	isDuoLessonType,
} from '@/components/agreements/wizard/wizardDerivedState';
import type { WizardFormState } from '@/components/agreements/wizard/wizardFormTypes';
import type { AgreementTableRow, WizardTeacherInfo } from '@/types/lesson-agreements';

type WizardLessonTypeListItem = { id: string; name: string; icon: string; color: string; is_duo_lesson: boolean };

interface UseWizardDerivedStateInput {
	step: WizardStep;
	form: WizardFormState;
	isEditMode: boolean;
	agreement: AgreementTableRow | null;
	lessonTypes: WizardLessonTypeListItem[];
	teachers: WizardTeacherInfo[];
}

export function useWizardDerivedState({
	step,
	form,
	isEditMode,
	agreement,
	lessonTypes,
	teachers,
}: UseWizardDerivedStateInput) {
	const matchedLessonType = agreement ? null : lessonTypes.find((lt) => lt.id === form.lessonTypeId);
	const selectedLessonType = useMemo(
		() => buildSelectedLessonType(agreement, matchedLessonType, form.selectedOptionSnapshot),
		[agreement, matchedLessonType, form.selectedOptionSnapshot],
	);

	const {
		slots: slotsWithStatus,
		loading: loadingSlots,
		reloadSlots,
	} = useWizardTeacherSlots(
		step,
		form.teacherUserId,
		form.lessonTypeId,
		form.startDate,
		form.endDate,
		agreement,
		selectedLessonType,
	);

	const selectedTeacher = useMemo(
		() => buildSelectedTeacher(teachers, form.teacherUserId, agreement),
		[teachers, form.teacherUserId, agreement],
	);

	const effectiveSlot = useMemo(() => buildEffectiveSlot(form.slot, agreement), [form.slot, agreement]);

	const hasChanges = computeHasChanges(agreement, form, effectiveSlot);
	const isTeacherOwnStudent =
		selectedTeacher && form.studentUserId ? selectedTeacher.userId === form.studentUserId : false;
	const isDuoLesson = isDuoLessonType(isEditMode, lessonTypes, form.lessonTypeId);
	const stepCanProceed = canProceedFromStep(step, form, isEditMode, isDuoLesson, isTeacherOwnStudent);

	return {
		selectedLessonType,
		slotsWithStatus,
		loadingSlots,
		reloadSlots,
		selectedTeacher,
		effectiveSlot,
		hasChanges,
		isTeacherOwnStudent,
		isDuoLesson,
		stepCanProceed,
	};
}
