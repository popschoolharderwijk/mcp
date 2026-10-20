import { LessonAgreementPreviewBlock } from '@/components/students/LessonAgreementPreviewBlock';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LessonTypeBadge } from '@/components/ui/lesson-type-badge';
import type { LessonFeePreview } from '@/lib/billing/loadLessonFeePreview';
import { frequencyLabels } from '@/lib/frequencies';
import {
	formatAgreementDate,
	resolveAgreementDayLabel,
	resolveAgreementEndDateLabel,
	resolveAgreementStatusLabel,
	resolveAgreementStatusVariant,
} from '@/lib/students/lessonAgreementDialogHelpers';
import { formatTime } from '@/lib/time/time-format';
import type { LessonAgreementWithTeacher } from '@/types/lesson-agreements';

interface LessonAgreementDialogContentProps {
	agreement: LessonAgreementWithTeacher;
	teacherName: string;
	teacherInitials: string;
	dayNames: readonly string[];
	showPreviewBlock: boolean;
	previewLoading: boolean;
	previewError: string | null;
	preview: LessonFeePreview | null;
}

export function LessonAgreementDialogContent({
	agreement,
	teacherName,
	teacherInitials,
	dayNames,
	showPreviewBlock,
	previewLoading,
	previewError,
	preview,
}: LessonAgreementDialogContentProps) {
	const statusVariant = resolveAgreementStatusVariant(agreement.is_active);
	const statusLabel = resolveAgreementStatusLabel(agreement.is_active);
	const dayLabel = resolveAgreementDayLabel(agreement.day_of_week, dayNames);
	const endDateLabel = resolveAgreementEndDateLabel(agreement.end_date);

	return (
		<div className="space-y-6 py-4">
			<div className="flex items-center gap-3">
				<LessonTypeBadge lessonType={agreement.lesson_type} size="lg" showName={false} />
				<div>
					<h3 className="font-semibold text-lg">{agreement.lesson_type.name}</h3>
					<Badge variant={statusVariant} className="mt-1">
						{statusLabel}
					</Badge>
				</div>
			</div>

			<div className="flex items-center gap-3">
				<Avatar className="h-12 w-12">
					<AvatarImage src={agreement.teacher.avatar_url ?? undefined} alt={teacherName} />
					<AvatarFallback className="bg-primary/10 text-primary">{teacherInitials}</AvatarFallback>
				</Avatar>
				<div>
					<p className="text-sm font-medium text-muted-foreground">Docent</p>
					<p className="font-semibold">{teacherName}</p>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<p className="text-sm font-medium text-muted-foreground">Dag</p>
					<p className="font-medium">{dayLabel}</p>
				</div>
				<div>
					<p className="text-sm font-medium text-muted-foreground">Tijd</p>
					<p className="font-medium">{formatTime(agreement.start_time)}</p>
				</div>
				<div>
					<p className="text-sm font-medium text-muted-foreground">Frequentie</p>
					<p className="font-medium">{frequencyLabels[agreement.frequency]}</p>
				</div>
				<div>
					<p className="text-sm font-medium text-muted-foreground">Lesduur</p>
					<p className="font-medium">{agreement.duration_minutes} min</p>
				</div>
				<div>
					<p className="text-sm font-medium text-muted-foreground">Startdatum</p>
					<p className="font-medium">{formatAgreementDate(agreement.start_date)}</p>
				</div>
				<div>
					<p className="text-sm font-medium text-muted-foreground">Einddatum</p>
					<p className="font-medium">{endDateLabel}</p>
				</div>
			</div>

			{showPreviewBlock && (
				<LessonAgreementPreviewBlock loading={previewLoading} error={previewError} preview={preview} />
			)}

			{agreement.notes && (
				<div>
					<p className="text-sm font-medium text-muted-foreground mb-2">Notities</p>
					<div className="rounded-md border bg-muted/50 p-3">
						<p className="text-sm whitespace-pre-wrap">{agreement.notes}</p>
					</div>
				</div>
			)}
		</div>
	);
}
