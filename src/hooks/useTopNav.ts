import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@/components/ThemeProvider';
import { getBaseBreadcrumb } from '@/config/breadcrumbs';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useAuth } from '@/hooks/useAuth';
import { useCommandPaletteHotkey, useTopNavProfileData } from '@/hooks/useTopNavProfile';
import { assembleTopNavHookResult, resolveTopNavBreadcrumbItems } from '@/lib/layout/topNavAssembleHelpers';

export function useTopNav() {
	const { user, signOut, isAdmin, isSiteAdmin, isPrivileged } = useAuth();
	const { pathname } = useLocation();
	const { suffix } = useBreadcrumb();
	const { setTheme, resolvedTheme } = useTheme();
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const { role, profile } = useTopNavProfileData(user?.id);

	const breadcrumbItems = useMemo(
		() => resolveTopNavBreadcrumbItems(pathname, suffix, (path) => getBaseBreadcrumb(path, { isPrivileged })),
		[pathname, suffix, isPrivileged],
	);

	const toggleCommandPalette = useCallback(() => setOpen((current) => !current), []);
	useCommandPaletteHotkey(toggleCommandPalette);

	return assembleTopNavHookResult({
		open,
		setOpen,
		breadcrumbItems,
		isAdmin,
		isSiteAdmin,
		userEmail: user?.email,
		role,
		profile,
		resolvedTheme,
		navigate,
		signOut,
		setTheme,
	});
}
