import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { NavItem } from '@/components/layout/NavItem';
import { SidebarCollapsibleGroup, SidebarGroupChevron } from '@/components/layout/SidebarCollapsibleGroup';
import { isSidebarGroupRouteActive } from '@/components/layout/sidebarGroupRouteHelpers';
import type { SidebarNavItemConfig, SidebarNavLinkConfig } from '@/components/layout/sidebarMainNavHelpers';
import {
	collapsedSidebarNavBranchParent,
	resolveSidebarGroupTrailingMode,
	resolveSidebarNavBranchLayout,
	sidebarNavBranchChildHrefs,
	sidebarNavBranchParentClick,
} from '@/components/layout/sidebarNavViewHelpers';
import { usePersistedSidebarGroupOpen } from '@/hooks/usePersistedSidebarGroupOpen';

interface SidebarNavBranchProps {
	item: SidebarNavItemConfig;
	collapsed: boolean;
}

function SidebarNavChildItems({ links, collapsed }: { links: SidebarNavLinkConfig[]; collapsed: boolean }) {
	return links.map((child) => (
		<NavItem key={child.key} href={child.href} label={child.label} icon={child.icon} collapsed={collapsed} />
	));
}

function CollapsedSidebarNavBranch({
	parent,
	links,
	collapsed,
}: {
	parent: ReactNode;
	links: SidebarNavLinkConfig[];
	collapsed: boolean;
}) {
	return (
		<>
			{parent}
			<SidebarNavChildItems links={links} collapsed={collapsed} />
		</>
	);
}

function groupTrailing({
	collapsed,
	hasChildren,
	isLink,
	isOpen,
	onOpenChange,
}: {
	collapsed: boolean;
	hasChildren: boolean;
	isLink: boolean;
	isOpen: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
	const mode = resolveSidebarGroupTrailingMode({
		collapsed,
		hasChildren,
		isLink,
		hasOpenChange: Boolean(onOpenChange),
	});
	if (mode === 'none') return undefined;
	const chevron = <SidebarGroupChevron open={isOpen} />;
	if (mode === 'chevron') return chevron;
	return (
		<button
			type="button"
			className="flex shrink-0 items-center self-stretch"
			aria-expanded={isOpen}
			onClick={() => onOpenChange?.(!isOpen)}
		>
			{chevron}
		</button>
	);
}

function renderSidebarNavBranch(params: {
	layout: ReturnType<typeof resolveSidebarNavBranchLayout>;
	parent: ReactNode;
	href: string | undefined;
	links: SidebarNavLinkConfig[];
	collapsed: boolean;
	isOpen: boolean;
	onGroupOpenChange?: (open: boolean) => void;
}) {
	if (params.layout === 'leaf') return params.parent;
	if (params.layout === 'collapsed-tree') {
		return (
			<CollapsedSidebarNavBranch
				parent={collapsedSidebarNavBranchParent(params.href, params.parent)}
				links={params.links}
				collapsed={params.collapsed}
			/>
		);
	}
	return (
		<SidebarCollapsibleGroup open={params.isOpen} onOpenChange={params.onGroupOpenChange} trigger={params.parent}>
			<SidebarNavChildItems links={params.links} collapsed={false} />
		</SidebarCollapsibleGroup>
	);
}

function SidebarNavBranchWithChildren({ item, collapsed }: SidebarNavBranchProps) {
	const { pathname } = useLocation();
	const links = item.children ?? [];
	const forceOpen = isSidebarGroupRouteActive(pathname, item);
	const [isOpen, setIsOpen] = usePersistedSidebarGroupOpen(item.key, forceOpen);
	const parent = (
		<NavItem
			href={item.href}
			label={item.label}
			icon={item.icon}
			collapsed={collapsed}
			childHrefs={sidebarNavBranchChildHrefs(item.children)}
			onClick={sidebarNavBranchParentClick(setIsOpen, pathname, item.href, isOpen)}
			trailing={groupTrailing({
				collapsed,
				hasChildren: links.length > 0,
				isLink: Boolean(item.href),
				isOpen,
				onOpenChange: setIsOpen,
			})}
		/>
	);

	return renderSidebarNavBranch({
		layout: resolveSidebarNavBranchLayout(true, collapsed),
		parent,
		href: item.href,
		links,
		collapsed,
		isOpen,
		onGroupOpenChange: setIsOpen,
	});
}

function SidebarNavBranchLeaf({ item, collapsed }: SidebarNavBranchProps) {
	return <NavItem href={item.href} label={item.label} icon={item.icon} collapsed={collapsed} childHrefs={[]} />;
}

export function SidebarNavBranch({ item, collapsed }: SidebarNavBranchProps) {
	if ((item.children?.length ?? 0) > 0) {
		return <SidebarNavBranchWithChildren item={item} collapsed={collapsed} />;
	}
	return <SidebarNavBranchLeaf item={item} collapsed={collapsed} />;
}
