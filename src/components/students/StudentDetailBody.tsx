import { PageHeader } from '@/components/ui/page-header';
import type { useStudentDetailPage } from '@/hooks/useStudentDetailPage';
import { getDisplayName } from '@/lib/display-name';
import { formatStudentPhoneSubtitle, type StudentProfileData } from '@/lib/students/studentDetailHelpers';
import type { StudentInfoTabId } from '@/lib/students/studentInfoTabsHelpers';
import { StudentInfoTabs } from '@/pages/student-detail/StudentInfoTabs';
import type { Student } from '@/types/students';

type StudentDetailPageData = Pick<
	ReturnType<typeof useStudentDetailPage>,
	'userId' | 'agreements' | 'signupRequests' | 'onProfileUpdate'
>;

interface StudentDetailBodyProps extends StudentDetailPageData {
	profile: StudentProfileData;
	student: Student;
	isPrivileged: boolean;
	canEditAgenda: boolean;
	activeTab: StudentInfoTabId;
	onTabChange: (tab: StudentInfoTabId) => void;
}

export function StudentDetailBody({
	profile,
	student,
	userId,
	agreements,
	signupRequests,
	isPrivileged,
	canEditAgenda,
	activeTab,
	onTabChange,
	onProfileUpdate,
}: StudentDetailBodyProps) {
	return (
		<div className="space-y-6">
			<PageHeader
				title={getDisplayName(profile)}
				subtitle={formatStudentPhoneSubtitle(profile.email, profile.phone_number)}
			/>

			<StudentInfoTabs
				userId={userId}
				student={student}
				agreements={agreements}
				signupRequests={signupRequests}
				isPrivileged={isPrivileged}
				canEditAgenda={canEditAgenda}
				activeTab={activeTab}
				onTabChange={onTabChange}
				onProfileUpdate={onProfileUpdate}
			/>
		</div>
	);
}
