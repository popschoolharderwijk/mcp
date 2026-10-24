import { Navigate } from 'react-router-dom';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { UserDetailContent } from '@/components/users/UserDetailContent';
import { useUserDetailPage } from '@/hooks/useUserDetailPage';
import { resolveUserDetailScreen } from '@/lib/users/userDetailPageHelpers';

export default function UserDetail() {
	const page = useUserDetailPage();
	const screen = resolveUserDetailScreen({
		tabRedirectTo: page.tabRedirectTo,
		authLoading: page.authLoading,
		hasAccess: page.hasAccess,
		loading: page.loading,
		user: page.user,
		notFound: page.notFound,
	});

	if (screen.kind === 'navigate') return <Navigate to={screen.to} replace />;
	if (screen.kind === 'loading') return <PageSkeleton variant="header-and-tabs" />;

	return (
		<UserDetailContent
			user={screen.user}
			activeTab={page.activeTab}
			onTabChange={page.onTabChange}
			onUpdate={page.onUpdate}
		/>
	);
}
