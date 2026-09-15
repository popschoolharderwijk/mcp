import { isPathInGroup } from '@/components/layout/sidebar-config';
import type { SidebarNavItemConfig } from '@/components/layout/sidebarMainNavHelpers';

function sidebarGroupRouteHrefs(item: SidebarNavItemConfig): string[] {
	const childHrefs = item.children?.map((child) => child.href) ?? [];
	if (!item.href) return childHrefs;
	return [item.href, ...childHrefs];
}

export function isSidebarGroupRouteActive(pathname: string, item: SidebarNavItemConfig): boolean {
	return isPathInGroup(pathname, sidebarGroupRouteHrefs(item));
}
