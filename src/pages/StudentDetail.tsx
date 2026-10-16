import { Navigate } from 'react-router-dom';
import { StudentDetailBody } from '@/components/students/StudentDetailBody';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useStudentDetailPage } from '@/hooks/useStudentDetailPage';
import { resolveStudentDetailPageContent, resolveStudentDetailScreen } from '@/lib/students/studentDetailHelpers';
import { resolveStudentDetailAccess } from '@/lib/students/studentInfoTabsHelpers';

export default function StudentDetail() {
	const { isPrivileged, isTeacher, isLoading: authLoading } = useAuth();
	const { canView, canEditAgenda } = resolveStudentDetailAccess(isPrivileged, isTeacher);
	const page = useStudentDetailPage({ authLoading, canView, isPrivileged });
	const screen = resolveStudentDetailScreen({
		tabRedirectTo: page.tabRedirectTo,
		activeTab: page.activeTab,
		content: resolveStudentDetailPageContent({
			authLoading,
			canView,
			loading: page.loading,
			profile: page.profile,
			student: page.student,
			userId: page.userId,
			agreements: page.agreements,
			signupRequests: page.signupRequests,
		}),
	});

	if (screen.kind === 'navigate') return <Navigate to={screen.to} replace />;
	if (screen.kind === 'loading') return <PageSkeleton variant="header-and-tabs" />;

	return (
		<StudentDetailBody
			profile={screen.profile}
			student={screen.student}
			userId={screen.userId}
			agreements={screen.agreements}
			signupRequests={screen.signupRequests}
			isPrivileged={isPrivileged}
			canEditAgenda={canEditAgenda}
			activeTab={screen.activeTab}
			onTabChange={page.onTabChange}
			onProfileUpdate={page.onProfileUpdate}
		/>
	);
}
