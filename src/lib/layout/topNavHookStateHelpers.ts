import type { TopNavUserInitialsInput } from '@/lib/layout/topNavHelpers';
import type { TopNavNavigationCallbacks } from '@/lib/layout/topNavHookHelpers';

export interface TopNavHookState {
	open: boolean;
	setOpen: (open: boolean) => void;
	breadcrumbItems: { label: string; href?: string }[];
	displayName: string;
	email: string | null | undefined;
	roleLabel: string | null;
	userInitialsInput: TopNavUserInitialsInput;
	avatarUrl: string | null | undefined;
	resolvedTheme: string;
	showAppVersion: boolean;
}

export function buildTopNavHookState(
	base: TopNavHookState,
	navigationCallbacks: TopNavNavigationCallbacks,
): TopNavHookState & TopNavNavigationCallbacks {
	return {
		...base,
		...navigationCallbacks,
	};
}
