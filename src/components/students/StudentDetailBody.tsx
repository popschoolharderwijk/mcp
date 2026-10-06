import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PageHeader } from '@/components/ui/page-header';
import type { useStudentDetailPage } from '@/hooks/useStudentDetailPage';
import { getDisplayName } from '@/lib/display-name';
import {
	buildStudentAvatarFallback,
	buildStudentInitials,
	formatStudentPhoneSubtitle,
	type StudentProfileData,
} from '@/lib/students/studentDetailHelpers';
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
}

export function StudentDetailBody({
	profile,
	student,
	userId,
	agreements,
	signupRequests,
	isPrivileged,
	canEditAgenda,
	onProfileUpdate,
}: StudentDetailBodyProps) {
	const displayName = getDisplayName(profile);
	const initials = buildStudentInitials(profile);

	return (
		<div className="space-y-6">
			<PageHeader
				icon={
					<Avatar className="h-16 w-16">
						<AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
						<AvatarFallback className="bg-primary/10 text-primary text-lg">
							{buildStudentAvatarFallback(profile, initials)}
						</AvatarFallback>
					</Avatar>
				}
				title={displayName}
				subtitle={formatStudentPhoneSubtitle(profile.email, profile.phone_number)}
			/>

			<StudentInfoTabs
				userId={userId}
				student={student}
				agreements={agreements}
				signupRequests={signupRequests}
				isPrivileged={isPrivileged}
				canEditAgenda={canEditAgenda}
				onProfileUpdate={onProfileUpdate}
			/>
		</div>
	);
}
