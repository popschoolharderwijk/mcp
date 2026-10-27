import { Navigate } from 'react-router-dom';
import { TeacherInfoPageContent } from '@/components/teachers/TeacherInfoPageContent';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { useTeacherInfoPage } from '@/hooks/useTeacherInfoPage';
import { shouldRedirectTeacherInfo, shouldShowTeacherInfoSkeleton } from '@/lib/teachers/teacherInfoPageShellHelpers';

export default function TeacherInfo() {
	const {
		pageGate,
		targetTeacherUserId,
		teacherProfile,
		agreementsCount,
		canAccess,
		activeTab,
		tabRedirectTo,
		onTabChange,
		onProfileUpdate,
	} = useTeacherInfoPage();

	if (tabRedirectTo) {
		return <Navigate to={tabRedirectTo} replace />;
	}

	if (shouldShowTeacherInfoSkeleton(pageGate, teacherProfile, targetTeacherUserId)) {
		return <PageSkeleton variant="header-and-tabs" />;
	}

	if (shouldRedirectTeacherInfo(pageGate)) {
		return <Navigate to="/" replace />;
	}

	return (
		<TeacherInfoPageContent
			targetTeacherUserId={targetTeacherUserId}
			teacherProfile={teacherProfile}
			agreementsCount={agreementsCount}
			canAccess={canAccess}
			activeTab={activeTab}
			onTabChange={onTabChange}
			onProfileUpdate={onProfileUpdate}
		/>
	);
}
