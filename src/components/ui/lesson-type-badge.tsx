import { ColorIcon } from '@/components/ui/color-icon';
import { resolveIconFromList } from '@/components/ui/icon-picker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MUSIC_ICONS } from '@/constants/icons';
import { cn } from '@/lib/utils';

interface LessonTypeBadgeProps {
	/** Name of the lesson type */
	name: string;
	/** Icon identifier (from MUSIC_ICONS) */
	icon?: string | null;
	/** Background color for the icon */
	color?: string | null;
	/** Optional description for tooltip (shown below name) */
	description?: string | null;
	/** Size variant for the icon */
	iconSize?: 'sm' | 'md' | 'lg';
	/** Show name text alongside icon (default: true) */
	showName?: boolean;
	/** Show tooltip with name (default: true when showName is false) */
	showTooltip?: boolean;
	/** Additional className */
	className?: string;
}

/**
 * Displays a lesson type with its icon and name.
 * Shows tooltip with name when showName is false (or when showTooltip is explicitly true).
 * Optionally shows description in tooltip.
 */
export function LessonTypeBadge({
	name,
	icon,
	color,
	description,
	iconSize = 'md',
	showName = true,
	showTooltip,
	className,
}: LessonTypeBadgeProps) {
	const Icon = icon ? resolveIconFromList(MUSIC_ICONS, icon) : undefined;

	// Show tooltip when explicitly requested, or when name is hidden
	const shouldShowTooltip = showTooltip ?? !showName;

	const content = (
		<div className={cn('flex items-center gap-2', className)}>
			<ColorIcon icon={Icon} color={color} size={iconSize} />
			{showName && <span className="truncate">{name}</span>}
		</div>
	);

	if (shouldShowTooltip) {
		return (
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>{content}</TooltipTrigger>
					<TooltipContent>
						<p>{name}</p>
						{description && <p className="text-xs text-muted-foreground">{description}</p>}
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		);
	}

	return content;
}
