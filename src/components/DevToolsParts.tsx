import type { ReactElement } from 'react';
import { useState } from 'react';
import { LuBug, LuChevronDown, LuChevronUp } from 'react-icons/lu';
import { DevLoginButton } from '@/components/DevLoginButton';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EnvironmentBadge } from '@/components/ui/environment-badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type DevToolsRenderMode = 'hidden' | 'production-badge' | 'collapsed' | 'expanded';

function resolveDevToolsRenderMode(isProduction: boolean, collapsed: boolean | undefined): DevToolsRenderMode {
	if (isProduction) {
		return collapsed === true ? 'production-badge' : 'hidden';
	}
	if (collapsed) {
		return 'collapsed';
	}
	return 'expanded';
}

const DEV_TOOLS_ACCENT = 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20';
const DEV_TOOLS_BADGE = 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/20';
const DEV_TOOLS_TRIGGER = 'text-orange-600 dark:text-orange-400 hover:bg-orange-500/10';

function DevToolsContent({ showHeader = true }: { showHeader?: boolean }) {
	return (
		<>
			{showHeader && (
				<div
					className={cn(
						'flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider w-full h-[28px]',
						DEV_TOOLS_ACCENT,
					)}
				>
					<LuBug className="h-3 w-3" />
					<span>Dev Tools</span>
				</div>
			)}
			<div
				className={cn(
					'flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium w-full h-[28px] border',
					DEV_TOOLS_BADGE,
				)}
			>
				<EnvironmentBadge className="flex items-center gap-1 text-inherit" />
			</div>
			<DevLoginButton className="w-full" showButton={true} autoLogin={true} />
		</>
	);
}

function DevToolsCollapsedMenu() {
	return (
		<TooltipProvider delayDuration={0}>
			<DropdownMenu>
				<Tooltip>
					<TooltipTrigger asChild>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-10 w-10 shrink-0 mx-auto text-muted-foreground hover:text-foreground"
								aria-label="Dev Tools"
							>
								<LuBug className="h-5 w-5" />
							</Button>
						</DropdownMenuTrigger>
					</TooltipTrigger>
					<TooltipContent side="right">Dev Tools</TooltipContent>
				</Tooltip>
				<DropdownMenuContent side="right" align="end" className="w-[200px] p-2">
					<div className="flex flex-col gap-2">
						<DevToolsContent />
					</div>
				</DropdownMenuContent>
			</DropdownMenu>
		</TooltipProvider>
	);
}

function DevToolsProductionBadgeView() {
	return (
		<div className="flex justify-center">
			<EnvironmentBadge className="text-[10px]" />
		</div>
	);
}

function DevToolsExpandedView({
	className,
	devMenuOpen,
	onDevMenuOpenChange,
}: {
	className?: string;
	devMenuOpen: boolean;
	onDevMenuOpenChange: (open: boolean) => void;
}) {
	return (
		<Collapsible
			open={devMenuOpen}
			onOpenChange={onDevMenuOpenChange}
			className={cn('flex flex-col w-[180px]', className)}
		>
			<CollapsibleTrigger asChild>
				<Button
					variant="ghost"
					className={cn(
						'w-full justify-between h-[28px] px-2 rounded text-[10px] font-semibold uppercase tracking-wider',
						DEV_TOOLS_TRIGGER,
					)}
					aria-label={devMenuOpen ? 'Dev menu sluiten' : 'Dev menu openen'}
				>
					<span className="flex items-center gap-1.5">
						<LuBug className="h-3 w-3" />
						Dev Tools
					</span>
					{devMenuOpen ? <LuChevronUp className="h-3 w-3" /> : <LuChevronDown className="h-3 w-3" />}
				</Button>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div className="flex flex-col gap-2 pt-2">
					<DevToolsContent showHeader={false} />
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

const DEV_TOOLS_VIEWS: Record<
	DevToolsRenderMode,
	(props: {
		className?: string;
		devMenuOpen: boolean;
		onDevMenuOpenChange: (open: boolean) => void;
	}) => ReactElement | null
> = {
	hidden: () => null,
	'production-badge': () => <DevToolsProductionBadgeView />,
	collapsed: () => <DevToolsCollapsedMenu />,
	expanded: (props) => <DevToolsExpandedView {...props} />,
};

export function DevToolsRoot({
	className,
	collapsed,
	defaultOpen = false,
}: {
	className?: string;
	collapsed?: boolean;
	defaultOpen?: boolean;
}) {
	const [devMenuOpen, setDevMenuOpen] = useState(defaultOpen);
	const renderMode = resolveDevToolsRenderMode(import.meta.env.MODE === 'production', collapsed);
	const View = DEV_TOOLS_VIEWS[renderMode];
	return View({ className, devMenuOpen, onDevMenuOpenChange: setDevMenuOpen });
}
