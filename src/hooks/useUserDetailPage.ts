import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useAuth } from '@/hooks/useAuth';
import { getDisplayName } from '@/lib/display-name';
import { type PersonDetailTabId, resolvePersonDetailTabRoute } from '@/lib/profile/personDetailTabsHelpers';
import { loadUserDetail } from '@/lib/users/userDetailLoadHelpers';
import {
	applyUserDetailLoadOutcome,
	resolveUserDetailRouteState,
	type UserDetailUser,
} from '@/lib/users/userDetailPageHelpers';

export function useUserDetailPage() {
	const { userId: routeUserId, tab: tabParam } = useParams<{ userId?: string; tab?: string }>();
	const navigate = useNavigate();
	const { user: authUser, isAdmin, isSiteAdmin, isLoading: authLoading } = useAuth();
	const { setBreadcrumbSuffix } = useBreadcrumb();

	const route = resolveUserDetailRouteState({
		routeUserId,
		authUserId: authUser?.id,
		isAdmin,
		isSiteAdmin,
		tabParam,
	});

	const [user, setUser] = useState<UserDetailUser | null>(null);
	const [loading, setLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);
	const [profileVersion, setProfileVersion] = useState(0);

	const reload = useCallback(async () => {
		if (!route.userId || !route.hasAccess) {
			setLoading(false);
			return;
		}
		setLoading(true);
		setNotFound(false);
		const result = await loadUserDetail(route.userId);
		applyUserDetailLoadOutcome(result, setUser, setNotFound);
		setLoading(false);
	}, [route.userId, route.hasAccess]);

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
		if (!route.basePath) return;
		navigate(resolvePersonDetailTabRoute(route.basePath, tab), { replace: true });
	};

	return {
		authLoading,
		hasAccess: route.hasAccess,
		loading,
		notFound,
		user,
		includeAgenda: route.includeAgenda,
		activeTab: route.activeTab,
		tabRedirectTo: route.tabRedirectTo,
		onTabChange,
		onUpdate: () => setProfileVersion((version) => version + 1),
	};
}
