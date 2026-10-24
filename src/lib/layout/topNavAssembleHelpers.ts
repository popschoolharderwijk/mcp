import type { NavigateFunction } from 'react-router-dom';
import type { TopNavProfile } from '@/lib/layout/topNavHelpers';
import {
	buildTopNavUserInitialsInput,
	canViewAppVersion,
	formatTopNavDisplayName,
	formatTopNavRoleLabel,
} from '@/lib/layout/topNavHelpers';
import { buildTopNavNavigationCallbacks } from '@/lib/layout/topNavHookHelpers';
import { buildTopNavHookState } from '@/lib/layout/topNavHookStateHelpers';

export interface TopNavHookInput {
	open: boolean;
	setOpen: (open: boolean) => void;
	breadcrumbItems: { label: string; href?: string }[];
	isAdmin: boolean;
	isSiteAdmin: boolean;
	userEmail: string | null | undefined;
	role: string | null;
	profile: TopNavProfile | null;
	resolvedTheme: string;
	navigate: NavigateFunction;
	signOut: () => Promise<void>;
	setTheme: (theme: 'light' | 'dark') => void;
}

export function assembleTopNavHookResult(input: TopNavHookInput) {
	const userInitialsInput = buildTopNavUserInitialsInput(input.profile, input.userEmail);
	const navigationCallbacks = buildTopNavNavigationCallbacks(
		input.navigate,
		input.signOut,
		input.resolvedTheme,
		input.setTheme,
	);

	return buildTopNavHookState(
		{
			open: input.open,
			setOpen: input.setOpen,
			breadcrumbItems: input.breadcrumbItems,
			displayName: formatTopNavDisplayName(input.profile, input.userEmail),
			email: input.userEmail,
			roleLabel: formatTopNavRoleLabel(input.role),
			userInitialsInput,
			avatarUrl: input.profile?.avatar_url,
			resolvedTheme: input.resolvedTheme,
			showAppVersion: canViewAppVersion(input.isAdmin, input.isSiteAdmin),
		},
		navigationCallbacks,
	);
}

export function resolveTopNavBreadcrumbItems(
	pathname: string,
	suffix: { label: string; href?: string }[],
	getBaseBreadcrumb: (pathname: string) => { label: string; href?: string }[],
): { label: string; href?: string }[] {
	return [...getBaseBreadcrumb(pathname), ...suffix];
}
