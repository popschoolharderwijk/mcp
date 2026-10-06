import { getUserInitials } from '@/lib/user-initials';
import type { AgreementTableRow } from '@/types/lesson-agreements';

export interface AgreementWizardStudentDisplay {
	studentName: string;
	studentInitials: string;
}

export function buildAgreementWizardStudentDisplay(agreement: AgreementTableRow): AgreementWizardStudentDisplay {
	const studentName =
		[agreement.student.first_name, agreement.student.last_name].filter(Boolean).join(' ') ||
		agreement.student.email;

	return {
		studentName,
		studentInitials: getUserInitials(agreement.student),
	};
}

export function shouldShowAgreementWizardEditHeader(
	isEditMode: boolean,
	agreement: AgreementTableRow | null,
): agreement is AgreementTableRow {
	return isEditMode && agreement !== null;
}
