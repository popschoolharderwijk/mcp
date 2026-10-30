import { type Dispatch, type SetStateAction, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { STEP_ORDER } from '@/components/agreements/WizardStepIndicator';
import { buildAgreementWizardReturn } from '@/components/agreements/wizard/agreementWizardReturn';
import { useAgreementWizardSetup } from '@/components/agreements/wizard/useAgreementWizardSetup';
import type { WizardFormState, WizardOptionSnapshot } from '@/components/agreements/wizard/wizardFormTypes';
import type { AgreementTableRow } from '@/types/lesson-agreements';
import type { User } from '@/types/users';

export function useAgreementWizard() {
	const { id } = useParams<{ id: string }>();
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	const urlParams = useMemo(
		() => ({
			id,
			fromRequestId: searchParams.get('fromRequest'),
			fromTrialId: searchParams.get('fromTrial'),
			prefillStudentUserId: searchParams.get('studentUserId'),
			prefillLessonTypeId: searchParams.get('lessonTypeId'),
			prefillOptionId: searchParams.get('optionId'),
		}),
		[id, searchParams],
	);

	const setup = useAgreementWizardSetup(navigate, urlParams);

	return buildAgreementWizardReturn({
		agreement: setup.agreement,
		loadingAgreement: setup.loadingAgreement,
		loadedPeriod: setup.loadedPeriod,
		isEditMode: setup.isEditMode,
		step: setup.step,
		setStep: setup.setStep,
		stepIndex: setup.stepIndex,
		highestStep: setup.highestStep,
		isFirstStep: setup.stepIndex === 0,
		isLastStep: setup.stepIndex === STEP_ORDER.length - 1,
		form: setup.form,
		setForm: setup.setForm,
		lessonTypes: setup.lessonTypes,
		lessonTypeOptions: setup.lessonTypeOptions,
		selectedLessonType: setup.derived.selectedLessonType,
		teachers: setup.teachers,
		selectedTeacher: setup.derived.selectedTeacher,
		slotsWithStatus: setup.derived.slotsWithStatus,
		loadingSlots: setup.derived.loadingSlots,
		effectiveSlot: setup.derived.effectiveSlot,
		hasChanges: setup.derived.hasChanges,
		isDuoLesson: setup.derived.isDuoLesson,
		isTeacherOwnStudent: setup.derived.isTeacherOwnStudent,
		stepCanProceed: setup.derived.stepCanProceed,
		partialConfirmOpen: setup.partialConfirmOpen,
		setPartialConfirmOpen: setup.setPartialConfirmOpen,
		saving: setup.saving,
		startDatePickerRef: setup.startDatePickerRef,
		nextStep: setup.nextStep,
		prevStep: setup.prevStep,
		handleSave: setup.handleSave,
		handleSlotClick: setup.handleSlotClick,
	});
}

export type AgreementWizardState = ReturnType<typeof useAgreementWizard>;

export type WizardFormUpdaters = {
	onStudentUserIdChange: (value: string | null) => void;
	onUserChange: (value: User | null) => void;
	onLessonTypeChange: (value: string | null) => void;
	onOptionSnapshotChange: (snapshot: WizardOptionSnapshot | null) => void;
	onPartnerStudentUserIdChange: (value: string | null) => void;
	onPartnerUserChange: (value: User | null) => void;
	onStartDateChange: (value: string) => void;
	onEndDateChange: (value: string) => void;
	onTeacherChange: (value: string | null) => void;
};

export function createWizardFormUpdaters(setForm: Dispatch<SetStateAction<WizardFormState>>): WizardFormUpdaters {
	return {
		onStudentUserIdChange: (value) => setForm((f) => ({ ...f, studentUserId: value })),
		onUserChange: (value) => setForm((f) => ({ ...f, user: value })),
		onLessonTypeChange: (value) =>
			setForm((f) => ({
				...f,
				lessonTypeId: value,
				selectedOptionSnapshot: null,
				partnerStudentUserId: null,
				partnerUser: null,
			})),
		onOptionSnapshotChange: (snapshot) => setForm((f) => ({ ...f, selectedOptionSnapshot: snapshot })),
		onPartnerStudentUserIdChange: (value) => setForm((f) => ({ ...f, partnerStudentUserId: value })),
		onPartnerUserChange: (value) => setForm((f) => ({ ...f, partnerUser: value })),
		onStartDateChange: (value) => setForm((f) => ({ ...f, startDate: value })),
		onEndDateChange: (value) => setForm((f) => ({ ...f, endDate: value })),
		onTeacherChange: (value) => setForm((f) => ({ ...f, teacherUserId: value, slot: null })),
	};
}

export function getCurrentAgreementSlot(
	isEditMode: boolean,
	agreement: AgreementTableRow | null,
	teacherUserId: string | null,
): { day_of_week: number; start_time: string } | null {
	if (!isEditMode || !agreement || teacherUserId !== agreement.teacher_user_id) return null;
	return { day_of_week: agreement.day_of_week, start_time: agreement.start_time };
}
