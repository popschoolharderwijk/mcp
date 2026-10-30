import { DevTools } from '@/components/DevTools';
import { SidebarLogo } from '@/components/layout/SidebarLogo';
import { SidebarMainNav } from '@/components/layout/SidebarMainNav';
import { SidebarNavSection } from '@/components/layout/SidebarNavSection';
import { administrationNavItems, adminNavItems, NAV_GAP } from '@/components/layout/sidebar-config';
import { ADMIN_SECTION_KEY, ADMINISTRATION_SECTION_KEY } from '@/components/layout/sidebarMainNavHelpers';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider } from '@/components/ui/tooltip';
import { NAV_ICONS, NAV_LABELS } from '@/config/nav-items';
import { useSidebarNavVisibility } from '@/hooks/useSidebarNavVisibility';
import { cn } from '@/lib/utils';

interface SidebarProps {
	collapsed?: boolean;
	onToggle?: () => void;
}

function sidebarWidthClass(collapsed: boolean): string {
	return collapsed ? 'w-16' : 'w-64';
}

function sidebarDevToolsClass(collapsed: boolean): string {
	return collapsed ? 'flex justify-center p-2' : 'p-2 w-full';
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
	const visibility = useSidebarNavVisibility();

	return (
		<TooltipProvider delayDuration={0}>
			<aside
				className={cn(
					'relative flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
					sidebarWidthClass(collapsed),
				)}
			>
				<SidebarLogo collapsed={collapsed} onToggle={onToggle} />

				<div className="flex-1 min-h-0 w-full overflow-hidden">
					<ScrollArea className="h-full">
						<div className="w-full px-2 py-2">
							<nav className="flex flex-col w-full" style={{ gap: NAV_GAP } as React.CSSProperties}>
								<SidebarMainNav collapsed={collapsed} {...visibility} />
								{visibility.showAdminNav ? (
									<>
										<SidebarNavSection
											collapsed={collapsed}
											storageKey={ADMINISTRATION_SECTION_KEY}
											label={NAV_LABELS.administrationSection}
											icon={NAV_ICONS.administrationSection}
											items={administrationNavItems}
										/>
										<SidebarNavSection
											collapsed={collapsed}
											storageKey={ADMIN_SECTION_KEY}
											label={NAV_LABELS.adminSection}
											icon={NAV_ICONS.adminSection}
											items={adminNavItems}
										/>
									</>
								) : null}
							</nav>
						</div>
					</ScrollArea>
				</div>

				<div className={cn('border-t border-sidebar-border', sidebarDevToolsClass(collapsed))}>
					<DevTools className={collapsed ? undefined : 'w-full'} collapsed={collapsed} />
				</div>
			</aside>
		</TooltipProvider>
	);
}
