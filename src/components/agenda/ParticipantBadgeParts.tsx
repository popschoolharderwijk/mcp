import { LuX } from 'react-icons/lu';
import { Link } from 'react-router-dom';
import type { ParticipantBadgeState } from '@/lib/agenda/agendaEventFormParticipantsHelpers';

export function ParticipantBadgeLabel({
	badgeState,
	id,
	onCloseDialog,
}: {
	badgeState: ParticipantBadgeState;
	id: string;
	onCloseDialog: () => void;
}) {
	if (badgeState.useSelfLabel) return badgeState.label;
	return (
		<Link to={`/students/${id}`} className="text-primary hover:underline" onClick={onCloseDialog}>
			{badgeState.label}
		</Link>
	);
}

export function ParticipantBadgeMeta({ badgeState }: { badgeState: ParticipantBadgeState }) {
	return (
		<>
			{badgeState.isOwner && <span className="text-xs text-muted-foreground">(eigenaar)</span>}
			{badgeState.isLessonParticipant && <span className="text-xs text-muted-foreground">(les)</span>}
		</>
	);
}

export function ParticipantBadgeRemoveButton({
	id,
	canRemove,
	onRemoveParticipant,
}: {
	id: string;
	canRemove: boolean;
	onRemoveParticipant: (userId: string) => void;
}) {
	if (!canRemove) return null;
	return (
		<button
			type="button"
			className="ml-1 rounded hover:bg-accent"
			onClick={() => onRemoveParticipant(id)}
			aria-label="Verwijderen"
		>
			<LuX className="h-3 w-3" />
		</button>
	);
}
