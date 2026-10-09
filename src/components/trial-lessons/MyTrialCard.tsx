import { LuCheck, LuX } from 'react-icons/lu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserDisplay } from '@/components/ui/user-display';
import { formatDbDateLong } from '@/lib/date/date-format';
import type { EnrichedTrialLessonStudent } from '@/lib/trial-lessons/enrichTrialLessons';
import {
	formatTrialScheduledTime,
	shouldShowTrialConfirmedMessage,
	shouldShowTrialDecisionButtons,
	type TrialDecision,
} from '@/lib/trial-lessons/myTrialHelpers';
import { getTrialStatusLabel } from '@/lib/trial-lessons/statusLabels';

interface MyTrialCardProps {
	trial: EnrichedTrialLessonStudent;
	busyId: string | null;
	onDecide: (trialId: string, decision: TrialDecision) => void;
}

export function MyTrialCard({ trial, busyId, onDecide }: MyTrialCardProps) {
	return (
		<div className="rounded-lg border bg-card p-6 space-y-4">
			<div className="flex items-start justify-between gap-3">
				<div className="space-y-2 min-w-0">
					<div className="text-lg font-semibold">{trial.lesson_type_name ?? 'Proefles'}</div>
					<UserDisplay profile={trial.teacher} />
				</div>
				<Badge variant="secondary">{getTrialStatusLabel(trial.status, 'student')}</Badge>
			</div>
			<div className="text-sm">
				<div>
					<strong>Datum:</strong> {formatDbDateLong(trial.scheduled_date)}
				</div>
				<div>
					<strong>Tijd:</strong> {formatTrialScheduledTime(trial.scheduled_start_time)} (
					{trial.duration_minutes} min)
				</div>
			</div>

			{shouldShowTrialDecisionButtons(trial.status) && (
				<div className="space-y-2 pt-2 border-t">
					<p className="text-sm font-medium">Wil je doorgaan met lessen?</p>
					<div className="flex gap-2">
						<Button onClick={() => onDecide(trial.id, 'confirm')} disabled={busyId === trial.id}>
							<LuCheck className="h-4 w-4 mr-1" /> Ja, ik wil doorgaan
						</Button>
						<Button
							variant="outline"
							onClick={() => onDecide(trial.id, 'decline')}
							disabled={busyId === trial.id}
						>
							<LuX className="h-4 w-4 mr-1" /> Nee, bedankt
						</Button>
					</div>
				</div>
			)}

			{shouldShowTrialConfirmedMessage(trial.status) && (
				<p className="text-sm text-muted-foreground">
					Bedankt! De school maakt nu een overeenkomst voor je en stuurt je de betaaluitnodiging.
				</p>
			)}
		</div>
	);
}
