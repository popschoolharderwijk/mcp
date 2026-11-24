import { Navigate } from 'react-router-dom';
import { StudentDetailBody } from '@/components/students/StudentDetailBody';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { useStudentDetailPage } from '@/hooks/useStudentDetailPage';
import { resolveStudentDetailPageContent, resolveStudentDetailScreen } from '@/lib/students/studentDetailHelpers';

export default function StudentDetail() {
	const page = useStudentDetailPage();
	const screen = resolveStudentDetailScreen({
		tabRedirectTo: page.tabRedirectTo,
		activeTab: page.activeTab,
		content: resolveStudentDetailPageContent({
			authLoading: page.authLoading,
			canView: page.canView,
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
			isPrivileged={page.isPrivileged}
			canViewPersonalData={page.canViewPersonalData}
			canManagePersonalData={page.canManagePersonalData}
			canEditAgenda={page.canEditAgenda}
			includeAgenda={page.includeAgenda}
			activeTab={screen.activeTab}
			onTabChange={page.onTabChange}
			onProfileUpdate={page.onProfileUpdate}
		/>
	);
}
