import { Link } from 'react-router-dom';
import { NavPageHeaderIcon } from '@/components/layout/NavPageHeaderIcon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
		const { studentName, studentInitials } = buildAgreementWizardStudentDisplay(agreement);

		return (
			<div className="mb-6">
				<PageHeader
					icon={
						<Avatar className="h-16 w-16">
							{agreement.student.avatar_url && (
								<AvatarImage src={agreement.student.avatar_url} alt={studentName} />
							)}
							<AvatarFallback className="bg-primary/10 text-primary text-xl">
								{studentInitials}
							</AvatarFallback>
						</Avatar>
					}
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
			<PageHeader icon={<NavPageHeaderIcon name="agreements" />} title="Nieuwe overeenkomst" />
		</div>
	);
}
