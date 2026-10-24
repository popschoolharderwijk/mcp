import { MyTrialCard } from '@/components/trial-lessons/MyTrialCard';
import type { EnrichedTrialLessonStudent } from '@/lib/trial-lessons/enrichTrialLessons';
import type { MyTrialContentState, TrialDecision } from '@/lib/trial-lessons/myTrialHelpers';

function shouldRenderMyTrialCard(
	contentState: MyTrialContentState,
	latest: EnrichedTrialLessonStudent | undefined,
): latest is EnrichedTrialLessonStudent {
	return contentState === 'content' && latest !== undefined;
}

interface MyTrialBodyProps {
	contentState: MyTrialContentState;
	latest: EnrichedTrialLessonStudent | undefined;
	busyId: string | null;
	onDecide: (trialId: string, decision: TrialDecision) => void;
}

function MyTrialLoadingMessage() {
	return <p className="text-sm text-muted-foreground">Laden…</p>;
}

function MyTrialEmptyMessage() {
	return (
		<p className="text-sm text-muted-foreground">
			Je hebt momenteel geen proefles ingepland. Neem contact op met de school als je een proefles wilt doen.
		</p>
	);
}

function MyTrialCardSection({
	latest,
	busyId,
	onDecide,
}: {
	latest: EnrichedTrialLessonStudent;
	busyId: string | null;
	onDecide: (trialId: string, decision: TrialDecision) => void;
}) {
	return <MyTrialCard trial={latest} busyId={busyId} onDecide={onDecide} />;
}

export function MyTrialBody({ contentState, latest, busyId, onDecide }: MyTrialBodyProps) {
	return (
		<div className="mt-6 max-w-xl">
			{contentState === 'loading' && <MyTrialLoadingMessage />}
			{contentState === 'empty' && <MyTrialEmptyMessage />}
			{shouldRenderMyTrialCard(contentState, latest) && (
				<MyTrialCardSection latest={latest} busyId={busyId} onDecide={onDecide} />
			)}
		</div>
	);
}
