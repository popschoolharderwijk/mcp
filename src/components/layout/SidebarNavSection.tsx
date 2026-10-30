import type { ComponentType } from 'react';
import { LuChevronDown } from 'react-icons/lu';
import { useLocation } from 'react-router-dom';
import { NavItem } from '@/components/layout/NavItem';
import { isPathInGroup, NAV_GAP } from '@/components/layout/sidebar-config';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { usePersistedSidebarGroupOpen } from '@/hooks/usePersistedSidebarGroupOpen';
import { cn } from '@/lib/utils';

export interface SidebarNavSectionItem {
	href: string;
	label: string;
	icon: ComponentType<{ className?: string }>;
}

interface SidebarNavSectionProps {
	collapsed: boolean;
	storageKey: string;
	label: string;
	icon: ComponentType<{ className?: string }>;
	items: readonly SidebarNavSectionItem[];
}

export function SidebarNavSection({ collapsed, storageKey, label, icon: Icon, items }: SidebarNavSectionProps) {
	const { pathname } = useLocation();
	const forceOpen = isPathInGroup(
		pathname,
		items.map((item) => item.href),
	);
	const [open, setOpen] = usePersistedSidebarGroupOpen(storageKey, forceOpen);

	if (collapsed) {
		return (
			<>
				<Separator />
				{items.map((item) => (
					<NavItem key={item.href} {...item} collapsed={collapsed} />
				))}
			</>
		);
	}

	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<CollapsibleTrigger asChild>
				<button
					type="button"
					className={cn(
						'mt-2 mb-0.5 flex w-full items-center gap-2 rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors',
						'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
					)}
				>
					<Icon className="h-3.5 w-3.5" />
					<span>{label}</span>
					<LuChevronDown
						className={cn(
							'ml-auto h-3.5 w-3.5 transition-transform duration-200',
							open ? 'rotate-0' : '-rotate-90',
						)}
					/>
				</button>
			</CollapsibleTrigger>
			<CollapsibleContent
				className="flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
				style={{ gap: NAV_GAP } as React.CSSProperties}
			>
				{items.map((item) => (
					<NavItem key={item.href} {...item} collapsed={false} />
				))}
			</CollapsibleContent>
		</Collapsible>
	);
}
