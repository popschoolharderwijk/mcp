import { useState } from 'react';
import { LuClipboardList } from 'react-icons/lu';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { type SignupRequestDetail, SignupRequestDialog } from './SignupRequestDialog';

interface SignupRequestItemProps {
	request: SignupRequestDetail;
	className?: string;
}

const STATUS_LABEL: Record<SignupRequestDetail['status'], string> = {
	pending: 'In behandeling',
	approved: 'Goedgekeurd',
	rejected: 'Afgewezen',
	trial_scheduled: 'Proefles ingepland',
};

const STATUS_BADGE_VARIANT: Record<SignupRequestDetail['status'], 'default' | 'secondary' | 'outline'> = {
	pending: 'default',
	approved: 'secondary',
	rejected: 'outline',
	trial_scheduled: 'outline',
};

export function SignupRequestItem({ request, className }: SignupRequestItemProps) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setOpen(true);
							}}
							onMouseDown={(e) => e.stopPropagation()}
							className={cn(
								'inline-flex items-center gap-2 rounded-lg border p-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 w-40',
								className,
							)}
						>
							<LuClipboardList className="h-4 w-4 shrink-0 text-muted-foreground" />
							<div className="flex flex-col gap-0.5 min-w-0">
								<span className="text-sm font-medium truncate">
									{request.lesson_type_name ?? 'Aanmelding'}
								</span>
								<Badge
									variant={STATUS_BADGE_VARIANT[request.status]}
									className="w-fit text-[10px] px-1 py-0"
								>
									{STATUS_LABEL[request.status]}
								</Badge>
							</div>
						</button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Aanmelding voor {request.lesson_type_name ?? 'lessoort'}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<SignupRequestDialog open={open} onOpenChange={setOpen} request={request} />
		</>
	);
}
