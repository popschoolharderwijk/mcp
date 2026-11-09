import { STEP_ORDER, WizardStep } from '@/components/agreements/WizardStepIndicator';
import type { AgreementTableRow } from '@/types/lesson-agreements';

function formPatchFromAgreement(agreement: AgreementTableRow, defaultEndDate: string) {
	return {
		studentUserId: agreement.student_user_id,
		user: {
			user_id: agreement.student_user_id,
			first_name: agreement.student.first_name,
			last_name: agreement.student.last_name,
			email: agreement.student.email,
			avatar_url: agreement.student.avatar_url,
			phone_number: null,
		},
		lessonTypeId: agreement.lesson_type_id,
		selectedOptionSnapshot: {
			duration_minutes: agreement.duration_minutes,
			frequency: agreement.frequency,
			price_per_lesson: agreement.price_per_lesson,
		},
		startDate: agreement.start_date,
		endDate: agreement.end_date?.trim() ? agreement.end_date : defaultEndDate,
		teacherUserId: agreement.teacher_user_id,
		slot: {
			day_of_week: agreement.day_of_week,
			start_time: agreement.start_time,
			end_time: agreement.start_time,
			status: 'free' as const,
			totalOccurrences: 0,
			occupiedOccurrences: 0,
		},
	};
}

function agreementBreadcrumbSuffix(agreement: AgreementTableRow, id: string) {
	const studentName = [agreement.student.first_name, agreement.student.last_name].filter(Boolean).join(' ');
	const label = studentName ? `${studentName} (${agreement.lesson_type.name})` : agreement.lesson_type.name;
	return [{ label, href: `/agreements/${id}` }];
}

export function wizardInitFromAgreement(
	loadingAgreement: boolean,
	isEditMode: boolean,
	agreement: AgreementTableRow | null,
	defaultEndDate: string,
) {
	if (loadingAgreement) return null;
	return {
		step: isEditMode ? WizardStep.Confirm : WizardStep.User,
		highestStep: isEditMode ? STEP_ORDER.length - 1 : 0,
		formPatch: agreement ? formPatchFromAgreement(agreement, defaultEndDate) : null,
	};
}

export function agreementBreadcrumbItems(
	loadingAgreement: boolean,
	isEditMode: boolean,
	agreement: AgreementTableRow | null,
	id: string | undefined,
) {
	if (loadingAgreement || !isEditMode || !agreement || !id) return null;
	return agreementBreadcrumbSuffix(agreement, id);
}
