import { LuChevronDown } from 'react-icons/lu';
import { useLocation } from 'react-router-dom';
import { NavItem } from '@/components/layout/NavItem';
import { SidebarNavBranch } from '@/components/layout/SidebarNavBranch';
import { adminHrefs, adminNavItems, isPathInGroup, NAV_GAP } from '@/components/layout/sidebar-config';
import { ADMIN_SECTION_KEY, buildFinanceNavGroup } from '@/components/layout/sidebarMainNavHelpers';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { NAV_ICONS, NAV_LABELS } from '@/config/nav-labels';
import { usePersistedSidebarGroupOpen } from '@/hooks/usePersistedSidebarGroupOpen';
import { cn } from '@/lib/utils';

const AdminSectionIcon = NAV_ICONS.adminSection;

interface SidebarAdminSectionProps {
	collapsed: boolean;
}

export function SidebarAdminSection({ collapsed }: SidebarAdminSectionProps) {
	const { pathname } = useLocation();
	const financeGroup = buildFinanceNavGroup();
	const forceOpen = isPathInGroup(pathname, adminHrefs);
	const [adminSectionOpen, setAdminSectionOpen] = usePersistedSidebarGroupOpen(ADMIN_SECTION_KEY, forceOpen);

	if (collapsed) {
		return (
			<>
				<Separator />
				<SidebarNavBranch item={financeGroup} collapsed={collapsed} />
				{adminNavItems.map((item) => (
					<NavItem key={item.href} {...item} collapsed={collapsed} />
				))}
			</>
		);
	}

	return (
		<Collapsible open={adminSectionOpen} onOpenChange={setAdminSectionOpen}>
			<CollapsibleTrigger asChild>
				<button
					type="button"
					className={cn(
						'mt-2 mb-0.5 flex w-full items-center gap-2 rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors',
						'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
					)}
				>
					<AdminSectionIcon className="h-3.5 w-3.5" />
					<span>{NAV_LABELS.adminSection}</span>
					<LuChevronDown
						className={cn(
							'ml-auto h-3.5 w-3.5 transition-transform duration-200',
							adminSectionOpen ? 'rotate-0' : '-rotate-90',
						)}
					/>
				</button>
			</CollapsibleTrigger>
			<CollapsibleContent
				className="flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
				style={{ gap: NAV_GAP } as React.CSSProperties}
			>
				<SidebarNavBranch item={financeGroup} collapsed={false} />
				{adminNavItems.map((item) => (
					<NavItem key={item.href} {...item} collapsed={false} />
				))}
			</CollapsibleContent>
		</Collapsible>
	);
}
