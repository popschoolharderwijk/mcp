import type { AgreementTableRow } from '@/types/lesson-agreements';

export function buildAgreementWizardStudentDisplay(agreement: AgreementTableRow): { studentName: string } {
	const studentName =
		[agreement.student.first_name, agreement.student.last_name].filter(Boolean).join(' ') ||
		agreement.student.email;

	return { studentName };
}

export function shouldShowAgreementWizardEditHeader(
	isEditMode: boolean,
	agreement: AgreementTableRow | null,
): agreement is AgreementTableRow {
	return isEditMode && agreement !== null;
}
