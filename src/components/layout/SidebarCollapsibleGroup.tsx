import { LuChevronDown } from 'react-icons/lu';
import { NAV_GAP } from '@/components/layout/sidebar-config';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const SIDEBAR_NESTED_NAV_CONTENT_CLASS =
	'flex flex-col pl-4 pt-1 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0';

interface SidebarCollapsibleGroupProps {
	open: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger: React.ReactNode;
	children: React.ReactNode;
}

export function SidebarCollapsibleGroup({ open, onOpenChange, trigger, children }: SidebarCollapsibleGroupProps) {
	return (
		<Collapsible open={open} onOpenChange={onOpenChange}>
			{trigger}
			<CollapsibleContent
				className={SIDEBAR_NESTED_NAV_CONTENT_CLASS}
				style={{ gap: NAV_GAP } as React.CSSProperties}
			>
				{children}
			</CollapsibleContent>
		</Collapsible>
	);
}

export function SidebarGroupChevron({ open }: { open: boolean }) {
	return (
		<LuChevronDown
			className={cn(
				'ml-auto mr-3 h-3.5 w-3.5 shrink-0 transition-transform duration-200',
				open ? 'rotate-0' : '-rotate-90',
			)}
		/>
	);
}
