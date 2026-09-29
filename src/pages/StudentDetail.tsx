import { Navigate } from 'react-router-dom';
import { StudentDetailBody } from '@/components/students/StudentDetailBody';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useStudentDetailPage } from '@/hooks/useStudentDetailPage';
import { resolveStudentDetailPageContent } from '@/lib/students/studentDetailHelpers';

export default function StudentDetail() {
	const { isPrivileged, isTeacher, isLoading: authLoading } = useAuth();
	const canView = isPrivileged || isTeacher;
	const page = useStudentDetailPage({ authLoading, canView });
	const content = resolveStudentDetailPageContent({
		authLoading,
		canView,
		loading: page.loading,
		profile: page.profile,
		userId: page.userId,
		agreements: page.agreements,
		signupRequests: page.signupRequests,
	});

	if (content.kind === 'loading') return <PageSkeleton variant="header-and-cards" />;
	if (content.kind === 'redirect') return <Navigate to={content.to} replace />;

	return (
		<StudentDetailBody
			profile={content.profile}
			userId={content.userId}
			agreements={content.agreements}
			signupRequests={content.signupRequests}
		/>
	);
}
