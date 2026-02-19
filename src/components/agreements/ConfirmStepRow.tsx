import type { ReactNode } from 'react';
import { LuCircleAlert } from 'react-icons/lu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface ConfirmStepRowProps {
	label: string;
	alwaysSame?: boolean;
	changed?: boolean;
	hideIcon?: boolean;
	oldValue?: ReactNode;
	newValue?: ReactNode;
	children?: ReactNode;
}

export function ConfirmStepRow({
	label,
	alwaysSame,
	changed,
	hideIcon,
	oldValue,
	newValue,
	children,
}: ConfirmStepRowProps) {
	const value = children ?? newValue ?? oldValue;
	// Apply muted styling when explicitly not changed (diff view) OR when alwaysSame
	const isMuted = changed === false || alwaysSame;
	const showChangedIcon = changed === true && !hideIcon;

	return (
		<div className={cn('flex flex-col gap-1 py-2 border-b border-border last:border-0', isMuted && 'opacity-60')}>
			<div className="flex items-center justify-between">
				<span className="text-xs font-medium text-muted-foreground">{label}</span>
				{showChangedIcon ? (
					<TooltipProvider delayDuration={0}>
						<Tooltip>
							<TooltipTrigger type="button">
								<LuCircleAlert className="h-4 w-4 text-primary" />
							</TooltipTrigger>
							<TooltipContent>
								<p>Dit veld is gewijzigd</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				) : null}
			</div>
			<div className="text-sm">{value}</div>
		</div>
	);
}
