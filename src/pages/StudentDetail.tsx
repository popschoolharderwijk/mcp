import { Navigate } from 'react-router-dom';
import { StudentDetailBody } from '@/components/students/StudentDetailBody';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useStudentDetailPage } from '@/hooks/useStudentDetailPage';
import { resolveStudentDetailPageContent } from '@/lib/students/studentDetailHelpers';
import { resolveStudentDetailAccess } from '@/lib/students/studentInfoTabsHelpers';

export default function StudentDetail() {
	const { isPrivileged, isTeacher, isLoading: authLoading } = useAuth();
	const { canView, canEditAgenda } = resolveStudentDetailAccess(isPrivileged, isTeacher);
	const page = useStudentDetailPage({ authLoading, canView });
	const content = resolveStudentDetailPageContent({
		authLoading,
		canView,
		loading: page.loading,
		profile: page.profile,
		student: page.student,
		userId: page.userId,
		agreements: page.agreements,
		signupRequests: page.signupRequests,
	});

	if (content.kind === 'loading') return <PageSkeleton variant="header-and-tabs" />;
	if (content.kind === 'redirect') return <Navigate to={content.to} replace />;

	return (
		<StudentDetailBody
			profile={content.profile}
			student={content.student}
			userId={content.userId}
			agreements={content.agreements}
			signupRequests={content.signupRequests}
			isPrivileged={isPrivileged}
			canEditAgenda={canEditAgenda}
			onProfileUpdate={page.onProfileUpdate}
		/>
	);
}
