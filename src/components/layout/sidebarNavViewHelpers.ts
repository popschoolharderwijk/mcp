import type { ReactNode } from 'react';
import { nextSidebarGroupOpen } from '@/components/layout/sidebar-config';
import type { SidebarNavLinkConfig } from '@/components/layout/sidebarMainNavHelpers';
import { cn } from '@/lib/utils';

export type NavItemLinkLayout = 'collapsed-tooltip' | 'trailing-row' | 'link';

export function resolveNavItemLinkLayout(collapsed: boolean, hasTrailing: boolean): NavItemLinkLayout {
	if (collapsed) return 'collapsed-tooltip';
	if (hasTrailing) return 'trailing-row';
	return 'link';
}

export function navItemLinkClassName(params: { collapsed: boolean; hasTrailing: boolean; stateClass: string }): string {
	const layoutClass = params.collapsed
		? 'w-fit justify-center rounded-lg'
		: params.hasTrailing
			? 'min-w-0 flex-1'
			: 'w-full rounded-lg';
	const applyState = params.collapsed || !params.hasTrailing;
	return cn(
		'flex items-center text-sm font-medium transition-colors duration-150 ease-in-out',
		layoutClass,
		applyState && params.stateClass,
	);
}

export type SidebarNavBranchLayout = 'leaf' | 'collapsed-tree' | 'collapsible';

export function resolveSidebarNavBranchLayout(hasChildren: boolean, collapsed: boolean): SidebarNavBranchLayout {
	if (!hasChildren) return 'leaf';
	if (collapsed) return 'collapsed-tree';
	return 'collapsible';
}

export function collapsedSidebarNavBranchParent(href: string | undefined, parent: ReactNode): ReactNode {
	if (!href) return null;
	return parent;
}

export function sidebarNavBranchParentClick(
	onGroupOpenChange: ((open: boolean) => void) | undefined,
	pathname: string,
	href: string | undefined,
	isOpen: boolean,
): (() => void) | undefined {
	if (!onGroupOpenChange) return undefined;
	return () => onGroupOpenChange(nextSidebarGroupOpen(pathname, href, isOpen));
}

export function sidebarNavBranchChildHrefs(children: SidebarNavLinkConfig[] | undefined): string[] {
	return children?.map((child) => child.href) ?? [];
}

export type SidebarGroupTrailingMode = 'none' | 'chevron' | 'toggle';

export function resolveSidebarGroupTrailingMode(params: {
	collapsed: boolean;
	hasChildren: boolean;
	isLink: boolean;
	hasOpenChange: boolean;
}): SidebarGroupTrailingMode {
	if (params.collapsed || !params.hasChildren) return 'none';
	if (!params.hasOpenChange) return 'chevron';
	return 'toggle';
}
