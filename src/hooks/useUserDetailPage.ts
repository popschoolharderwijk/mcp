import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useAuth } from '@/hooks/useAuth';
import { getDisplayName } from '@/lib/display-name';
import {
	type PersonDetailTabId,
	parsePersonDetailTab,
	resolvePersonDetailTabRedirect,
	resolvePersonDetailTabRoute,
} from '@/lib/profile/personDetailTabsHelpers';
import { loadUserDetail } from '@/lib/users/userDetailLoadHelpers';
import {
	applyUserDetailLoadOutcome,
	resolveUserDetailBasePath,
	type UserDetailUser,
} from '@/lib/users/userDetailPageHelpers';
import { shouldShowUsersPage } from '@/lib/users/usersPageShellHelpers';

export function useUserDetailPage() {
	const { userId, tab: tabParam } = useParams<{ userId: string; tab?: string }>();
	const navigate = useNavigate();
	const { isAdmin, isSiteAdmin, isLoading: authLoading } = useAuth();
	const { setBreadcrumbSuffix } = useBreadcrumb();
	const hasAccess = shouldShowUsersPage(isAdmin, isSiteAdmin);

	const [user, setUser] = useState<UserDetailUser | null>(null);
	const [loading, setLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);
	const [profileVersion, setProfileVersion] = useState(0);

	const basePath = userId ? resolveUserDetailBasePath(userId) : '';
	const activeTab = parsePersonDetailTab(tabParam);
	const tabRedirectTo = userId ? resolvePersonDetailTabRedirect(basePath, tabParam) : null;

	const reload = useCallback(async () => {
		if (!userId || !hasAccess) {
			setLoading(false);
			return;
		}
		setLoading(true);
		setNotFound(false);
		const result = await loadUserDetail(userId);
		applyUserDetailLoadOutcome(result, setUser, setNotFound);
		setLoading(false);
	}, [userId, hasAccess]);

	useEffect(() => {
		void profileVersion;
		void reload();
	}, [reload, profileVersion]);

	useEffect(() => {
		if (!user) {
			setBreadcrumbSuffix([]);
			return;
		}
		setBreadcrumbSuffix([{ label: getDisplayName(user) }]);
		return () => setBreadcrumbSuffix([]);
	}, [user, setBreadcrumbSuffix]);

	const onTabChange = (tab: PersonDetailTabId) => {
		if (!basePath) return;
		navigate(resolvePersonDetailTabRoute(basePath, tab), { replace: true });
	};

	return {
		authLoading,
		hasAccess,
		loading,
		notFound,
		user,
		activeTab,
		tabRedirectTo,
		onTabChange,
		onUpdate: () => setProfileVersion((version) => version + 1),
	};
}
