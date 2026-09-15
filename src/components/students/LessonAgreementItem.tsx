import { useState } from 'react';
import { LessonTypeBadge } from '@/components/ui/lesson-type-badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getDayNameFromDbIndex } from '@/lib/date/day-index';
import { getDisplayName } from '@/lib/display-name';
import { formatTime } from '@/lib/time/time-format';
import { cn } from '@/lib/utils';
import type { LessonAgreementWithTeacher } from '@/types/lesson-agreements';
import { LessonAgreementDialog } from './LessonAgreementDialog';

export type LessonAgreement = LessonAgreementWithTeacher;

interface LessonAgreementItemProps {
	agreement: LessonAgreement;
	className?: string;
	readOnly?: boolean;
	/** Optional: required to show billing preview in the detail dialog. */
	studentUserId?: string;
	lessonTypeId?: string;
}

function getTooltipText(agreement: LessonAgreementWithTeacher, teacherName: string): string {
	const dayName = getDayNameFromDbIndex(agreement.day_of_week);
	const time = formatTime(agreement.start_time);
	return `${agreement.lesson_type.name}\n${teacherName}\n${dayName} om ${time}`;
}

export function LessonAgreementItem({
	agreement,
	className,
	readOnly = false,
	studentUserId,
	lessonTypeId,
}: LessonAgreementItemProps) {
	const [dialogOpen, setDialogOpen] = useState(false);

	const teacherName = getDisplayName(agreement.teacher);

	const handleOpenChange = (open: boolean) => {
		setDialogOpen(open);
	};

	const tooltipText = getTooltipText(agreement, teacherName);

	const innerContent = (
		<>
			{/* Lesson Type Icon */}
			<div className="shrink-0">
				<LessonTypeBadge lessonType={agreement.lesson_type} showName={false} showTooltip={false} />
			</div>

			{/* Teacher Name */}
			<span className="font-medium truncate text-sm flex-1 min-w-0">{teacherName}</span>
		</>
	);

	if (readOnly) {
		return (
			<div
				className={cn(
					'inline-flex items-center gap-3 rounded-lg border p-3 text-left w-40 bg-muted/50 cursor-default',
					className,
				)}
			>
				{innerContent}
			</div>
		);
	}

	return (
		<>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							type="button"
							data-agreement-id={agreement.id}
							onClick={(e) => {
								e.stopPropagation();
								setDialogOpen(true);
							}}
							onMouseDown={(e) => {
								// Prevent row click when clicking on button
								e.stopPropagation();
							}}
							className={cn(
								'inline-flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 w-40',
								className,
							)}
						>
							{innerContent}
						</button>
					</TooltipTrigger>
					<TooltipContent>
						<p className="whitespace-pre-line">{tooltipText}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>

			<LessonAgreementDialog
				open={dialogOpen}
				onOpenChange={handleOpenChange}
				agreement={agreement}
				studentUserId={studentUserId}
				lessonTypeId={lessonTypeId}
			/>
		</>
	);
}
