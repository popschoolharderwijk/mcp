import type { ComponentType, ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { isSidebarParentActive, sidebarNavItemStateClass } from '@/components/layout/sidebar-config';
import { navItemLinkClassName, resolveNavItemLinkLayout } from '@/components/layout/sidebarNavViewHelpers';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface NavItemProps {
	href?: string;
	label: string;
	icon: ComponentType<{ className?: string }>;
	collapsed: boolean;
	childHrefs?: readonly string[];
	trailing?: ReactNode;
	onClick?: () => void;
}

const NAV_ITEM_ROW_CLASS =
	'flex w-full items-center rounded-lg text-sm font-medium transition-colors duration-150 ease-in-out';

function NavItemContent({
	collapsed,
	label,
	icon: Icon,
}: {
	collapsed: boolean;
	label: string;
	icon: ComponentType<{ className?: string }>;
}) {
	return (
		<>
			<span className="grid size-8 shrink-0 place-items-center">
				<Icon className="h-4 w-4" />
			</span>
			{!collapsed && <span className="truncate">{label}</span>}
		</>
	);
}

function NavItemButton({
	onClick,
	stateClass,
	content,
	collapsed,
	trailing,
}: {
	onClick?: () => void;
	stateClass: string;
	content: ReactNode;
	collapsed: boolean;
	trailing?: ReactNode;
}) {
	if (trailing && !collapsed) {
		return (
			<NavItemTrailingRow stateClass={stateClass} trailing={trailing}>
				<button
					type="button"
					onClick={onClick}
					className="flex min-w-0 flex-1 items-center rounded-lg text-left text-sm font-medium"
				>
					{content}
				</button>
			</NavItemTrailingRow>
		);
	}

	return (
		<button type="button" onClick={onClick} className={cn(NAV_ITEM_ROW_CLASS, stateClass)}>
			{content}
		</button>
	);
}

function NavItemCollapsedTooltip({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex justify-center w-full">
			<Tooltip delayDuration={0}>
				<TooltipTrigger asChild>
					<div className="flex justify-center w-full">{children}</div>
				</TooltipTrigger>
				<TooltipContent side="right">{label}</TooltipContent>
			</Tooltip>
		</div>
	);
}

function NavItemTrailingRow({
	stateClass,
	trailing,
	children,
}: {
	stateClass: string;
	trailing?: ReactNode;
	children: ReactNode;
}) {
	return (
		<div className={cn(NAV_ITEM_ROW_CLASS, stateClass)}>
			{children}
			{trailing}
		</div>
	);
}

function NavItemLink({
	href,
	label,
	onClick,
	collapsed,
	trailing,
	stateClass,
	content,
}: {
	href: string;
	label: string;
	onClick?: () => void;
	collapsed: boolean;
	trailing?: ReactNode;
	stateClass: string;
	content: ReactNode;
}) {
	const linkLayout = resolveNavItemLinkLayout(collapsed, Boolean(trailing));
	const link = (
		<NavLink
			to={href}
			onClick={onClick}
			className={navItemLinkClassName({ collapsed, hasTrailing: Boolean(trailing), stateClass })}
		>
			{content}
		</NavLink>
	);

	if (linkLayout === 'collapsed-tooltip') {
		return <NavItemCollapsedTooltip label={label}>{link}</NavItemCollapsedTooltip>;
	}

	if (linkLayout === 'trailing-row') {
		return (
			<NavItemTrailingRow stateClass={stateClass} trailing={trailing}>
				{link}
			</NavItemTrailingRow>
		);
	}

	return link;
}

export function NavItem({ href, label, icon: Icon, collapsed, childHrefs = [], trailing, onClick }: NavItemProps) {
	const { pathname } = useLocation();
	const isActive = isSidebarParentActive(pathname, href, childHrefs);
	const stateClass = sidebarNavItemStateClass(isActive);
	const content = <NavItemContent collapsed={collapsed} label={label} icon={Icon} />;

	if (!href) {
		return (
			<NavItemButton
				onClick={onClick}
				stateClass={stateClass}
				content={content}
				collapsed={collapsed}
				trailing={trailing}
			/>
		);
	}

	return (
		<NavItemLink
			href={href}
			label={label}
			onClick={onClick}
			collapsed={collapsed}
			trailing={trailing}
			stateClass={stateClass}
			content={content}
		/>
	);
}
