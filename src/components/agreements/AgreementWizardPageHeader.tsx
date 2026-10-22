import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import {
	buildAgreementWizardStudentDisplay,
	shouldShowAgreementWizardEditHeader,
} from '@/lib/agreements/agreementWizardPageHeaderHelpers';
import { buildStudentDetailPath } from '@/lib/students/studentInfoTabsHelpers';
import type { AgreementTableRow } from '@/types/lesson-agreements';

interface AgreementWizardPageHeaderProps {
	isEditMode: boolean;
	agreement: AgreementTableRow | null;
}

export function AgreementWizardPageHeader({ isEditMode, agreement }: AgreementWizardPageHeaderProps) {
	if (shouldShowAgreementWizardEditHeader(isEditMode, agreement)) {
		const { studentName } = buildAgreementWizardStudentDisplay(agreement);

		return (
			<div className="mb-6">
				<PageHeader
					title={
						<Link to={buildStudentDetailPath(agreement.student_user_id)} className="hover:underline">
							{studentName}
						</Link>
					}
					subtitle={agreement.lesson_type.name}
				/>
			</div>
		);
	}

	return (
		<div className="mb-6">
			<PageHeader title="Nieuwe overeenkomst" />
		</div>
	);
}
