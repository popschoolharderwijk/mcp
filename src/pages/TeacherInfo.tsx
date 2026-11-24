import { Navigate } from 'react-router-dom';
import { TeacherInfoPageContent } from '@/components/teachers/TeacherInfoPageContent';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { useTeacherInfoPage } from '@/hooks/useTeacherInfoPage';
import { resolveTeacherInfoScreen } from '@/lib/teachers/teacherInfoPageShellHelpers';

export default function TeacherInfo() {
	const page = useTeacherInfoPage();
	const screen = resolveTeacherInfoScreen({
		tabRedirectTo: page.tabRedirectTo,
		pageGate: page.pageGate,
		targetTeacherUserId: page.targetTeacherUserId,
		teacherProfile: page.teacherProfile,
	});

	if (screen.kind === 'navigate') return <Navigate to={screen.to} replace />;
	if (screen.kind === 'loading') return <PageSkeleton variant="header-and-tabs" />;

	return (
		<TeacherInfoPageContent
			targetTeacherUserId={screen.targetTeacherUserId}
			teacherProfile={screen.teacherProfile}
			agreementsCount={page.agreementsCount}
			availabilityCount={page.availabilityCount}
			canAccess={page.canAccess}
			includeAgenda={page.includeAgenda}
			activeTab={page.activeTab}
			onTabChange={page.onTabChange}
			onProfileUpdate={page.onProfileUpdate}
			onAvailabilityMutated={page.onAvailabilityMutated}
		/>
	);
}
