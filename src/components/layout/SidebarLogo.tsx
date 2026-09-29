import { BrandLockup } from '@/components/layout/BrandLockup';
import { SidebarLogoToggleButton } from '@/components/layout/SidebarLogoParts';
import { cn } from '@/lib/utils';

interface SidebarLogoProps {
	collapsed: boolean;
	onToggle?: () => void;
}

export function SidebarLogo({ collapsed, onToggle }: SidebarLogoProps) {
	return (
		<div
			className={cn(
				'group relative flex h-16 items-center border-b border-sidebar-border',
				collapsed ? 'justify-center px-0' : 'gap-2 px-4',
			)}
		>
			<BrandLockup compact={collapsed} />
			<SidebarLogoToggleButton collapsed={collapsed} onToggle={onToggle} />
		</div>
	);
}
