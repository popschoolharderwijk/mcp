import { DevTools } from '@/components/DevTools';
import { SidebarAdminSection } from '@/components/layout/SidebarAdminSection';
import { SidebarLogo } from '@/components/layout/SidebarLogo';
import { SidebarMainNav } from '@/components/layout/SidebarMainNav';
import { NAV_GAP } from '@/components/layout/sidebar-config';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useSidebarNavVisibility } from '@/hooks/useSidebarNavVisibility';
import { resolveSidebarDevToolsContainerClass, resolveSidebarWidthClass } from '@/lib/layout/sidebarShellHelpers';
import { cn } from '@/lib/utils';

interface SidebarProps {
	collapsed?: boolean;
	onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
	const visibility = useSidebarNavVisibility();

	return (
		<TooltipProvider delayDuration={0}>
			<aside
				className={cn(
					'relative flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
					resolveSidebarWidthClass(collapsed),
				)}
			>
				<SidebarLogo collapsed={collapsed} onToggle={onToggle} />

				<div className="flex-1 min-h-0 w-full overflow-hidden">
					<ScrollArea className="h-full">
						<div className="w-full px-2 py-2">
							<nav className="flex flex-col w-full" style={{ gap: NAV_GAP } as React.CSSProperties}>
								<SidebarMainNav collapsed={collapsed} {...visibility} />
								{visibility.showAdminNav && <SidebarAdminSection collapsed={collapsed} />}
							</nav>
						</div>
					</ScrollArea>
				</div>

				<div className={cn('border-t border-sidebar-border', resolveSidebarDevToolsContainerClass(collapsed))}>
					<DevTools className={collapsed ? undefined : 'w-full'} collapsed={collapsed} />
				</div>
			</aside>
		</TooltipProvider>
	);
}
