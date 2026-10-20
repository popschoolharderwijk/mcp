import { WizardStep } from '@/components/agreements/WizardStepIndicator';
import type { WizardFormState } from '@/components/agreements/wizard/wizardFormTypes';
import type { SlotWithStatus } from '@/lib/agreementSlots';
import { formatTime } from '@/lib/time/time-format';
import type { AgreementTableRow, WizardLessonTypeInfo, WizardTeacherInfo } from '@/types/lesson-agreements';

type LessonTypeListItem = { id: string; is_duo_lesson: boolean };

export function buildSelectedLessonType(
	agreement: AgreementTableRow | null,
	matchedLessonType: { id: string; name: string; icon: string; color: string } | undefined,
	selectedOptionSnapshot: WizardFormState['selectedOptionSnapshot'],
): WizardLessonTypeInfo | undefined {
	if (agreement) {
		return {
			id: agreement.lesson_type_id,
			name: agreement.lesson_type.name,
			icon: agreement.lesson_type.icon,
			color: agreement.lesson_type.color,
			duration_minutes: agreement.duration_minutes,
			frequency: agreement.frequency,
			lesson_type_option_id: agreement.lesson_type_option_id ?? null,
		};
	}

	if (!matchedLessonType || !selectedOptionSnapshot) return undefined;

	return {
		id: matchedLessonType.id,
		name: matchedLessonType.name,
		icon: matchedLessonType.icon,
		color: matchedLessonType.color,
		duration_minutes: selectedOptionSnapshot.duration_minutes,
		frequency: selectedOptionSnapshot.frequency,
		lesson_type_option_id: selectedOptionSnapshot.id,
	};
}

export function buildSelectedTeacher(
	teachers: WizardTeacherInfo[],
	teacherUserId: string | null,
	agreement: AgreementTableRow | null,
): WizardTeacherInfo | undefined {
	if (teachers.length > 0) {
		return teachers.find((t) => t.id === teacherUserId);
	}

	if (!agreement?.teacher) return undefined;

	return {
		id: agreement.teacher_user_id,
		userId: '',
		firstName: agreement.teacher.first_name,
		lastName: agreement.teacher.last_name,
		email: agreement.teacher.email ?? '',
		avatarUrl: agreement.teacher.avatar_url,
	};
}

export function buildEffectiveSlot(
	slot: SlotWithStatus | null,
	agreement: AgreementTableRow | null,
): SlotWithStatus | null {
	if (slot) return slot;
	if (!agreement?.day_of_week) return null;

	return {
		day_of_week: agreement.day_of_week,
		start_time: agreement.start_time,
		end_time: agreement.start_time,
		status: 'free',
		occupiedOccurrences: 0,
		totalOccurrences: 0,
	};
}

export function computeHasChanges(
	agreement: AgreementTableRow | null,
	form: WizardFormState,
	effectiveSlot: SlotWithStatus | null,
): boolean {
	if (!agreement) return false;

	return (
		agreement.start_date !== form.startDate ||
		(agreement.end_date ?? '') !== form.endDate ||
		agreement.teacher_user_id !== form.teacherUserId ||
		agreement.day_of_week !== effectiveSlot?.day_of_week ||
		formatTime(agreement.start_time) !== (effectiveSlot ? formatTime(effectiveSlot.start_time) : '') ||
		(agreement.payment_method ?? 'stripe') !== form.paymentMethod ||
		(agreement.sepa_mandate_id ?? null) !== (form.paymentMethod === 'sepa' ? form.sepaMandateId : null)
	);
}

export function isDuoLessonType(
	isEditMode: boolean,
	lessonTypes: LessonTypeListItem[],
	lessonTypeId: string | null,
): boolean {
	if (isEditMode) return false;
	return Boolean(lessonTypes.find((t) => t.id === lessonTypeId)?.is_duo_lesson);
}

export function canProceedFromStep(
	step: WizardStep,
	form: WizardFormState,
	isEditMode: boolean,
	isDuoLesson: boolean,
	isTeacherOwnStudent: boolean | null | undefined,
): boolean {
	switch (step) {
		case WizardStep.User:
			return Boolean(
				form.studentUserId &&
					form.lessonTypeId &&
					(isEditMode || form.selectedOptionSnapshot) &&
					(!isDuoLesson || (form.partnerStudentUserId && form.partnerStudentUserId !== form.studentUserId)),
			);
		case WizardStep.Period:
			return Boolean(form.startDate && (!form.endDate || new Date(form.endDate) >= new Date(form.startDate)));
		case WizardStep.TeacherSlot:
			return Boolean(form.slot && form.slot.status !== 'occupied' && !isTeacherOwnStudent);
		case WizardStep.Confirm:
			return true;
	}
}
