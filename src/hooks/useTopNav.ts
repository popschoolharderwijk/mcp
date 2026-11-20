import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@/components/ThemeProvider';
import { getBaseBreadcrumb } from '@/config/breadcrumbs';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useAuth } from '@/hooks/useAuth';
import { useCommandPaletteHotkey, useTopNavProfileData } from '@/hooks/useTopNavProfile';
import { assembleTopNavHookResult, resolveTopNavBreadcrumbItems } from '@/lib/layout/topNavAssembleHelpers';

export function useTopNav() {
	const auth = useAuth();
	const loginUserId = auth.user?.id;
	const profileUserId = auth.activeProfileId ?? loginUserId;
	const { pathname } = useLocation();
	const { suffix } = useBreadcrumb();
	const { setTheme, resolvedTheme } = useTheme();
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const { role, profile } = useTopNavProfileData(loginUserId, profileUserId);
	const breadcrumbItems = useMemo(
		() => resolveTopNavBreadcrumbItems(pathname, suffix, getBaseBreadcrumb),
		[pathname, suffix],
	);
	const toggleCommandPalette = useCallback(() => setOpen((current) => !current), []);
	useCommandPaletteHotkey(toggleCommandPalette);

	return assembleTopNavHookResult({
		open,
		setOpen,
		breadcrumbItems,
		isAdmin: auth.isAdmin,
		isSiteAdmin: auth.isSiteAdmin,
		userEmail: auth.user?.email,
		role,
		profile,
		resolvedTheme,
		navigate,
		signOut: auth.signOut,
		setTheme,
		membershipCount: auth.membershipProfiles.length,
		onSwitchProfile: auth.reopenProfileSelection,
	});
}
