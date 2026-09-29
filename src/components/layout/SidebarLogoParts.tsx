import type { MouseEvent } from 'react';
import { LuChevronLeft } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarLogoToggleButtonProps {
	collapsed: boolean;
	onToggle?: () => void;
}

const collapsedToggleClassName =
	'absolute left-1/2 top-1/2 z-10 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-lg text-primary-foreground opacity-0 transition-opacity hover:bg-primary hover:opacity-100 group-hover:bg-primary group-hover:opacity-100 focus-visible:ring-0 focus-visible:ring-offset-0';

export function SidebarLogoToggleButton({ collapsed, onToggle }: SidebarLogoToggleButtonProps) {
	const className = collapsed
		? collapsedToggleClassName
		: 'ml-auto h-8 w-8 text-muted-foreground hover:text-foreground';

	function handleToggle(event: MouseEvent<HTMLButtonElement>) {
		onToggle?.();
		event.currentTarget.blur();
	}

	return (
		<Button
			variant="ghost"
			size="icon"
			className={className}
			onClick={handleToggle}
			aria-label={collapsed ? 'Zijbalk uitklappen' : 'Zijbalk inklappen'}
		>
			<LuChevronLeft className={cn('h-4 w-4', collapsed && 'rotate-180')} />
		</Button>
	);
}
