import { Button } from '@/components/ui/button';
import { NAV_ICONS, NAV_LABELS } from '@/config/nav-items';
import { cn } from '@/lib/utils';

interface TipsNavButtonProps {
	hasNewTips: boolean;
	onClick: () => void;
}

const TipsIcon = NAV_ICONS.tips;

export function TipsNavButton({ hasNewTips, onClick }: TipsNavButtonProps) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			className={cn('h-9 w-9', !hasNewTips && 'text-muted-foreground opacity-60')}
			onClick={onClick}
			data-tip-target="tips-nav"
		>
			<TipsIcon className={cn('h-5 w-5', hasNewTips && 'fill-yellow-400 text-yellow-500')} aria-hidden />
			<span className="sr-only">{NAV_LABELS.tips}</span>
		</Button>
	);
}
