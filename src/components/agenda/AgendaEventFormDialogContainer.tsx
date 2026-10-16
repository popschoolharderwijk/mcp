import type { User } from '@supabase/supabase-js';
import { AgendaEventFormDialog } from '@/components/agenda/AgendaEventFormDialog';
import {
	buildAgendaEventFormDialogContainerInput,
	resolveAgendaCancelLessonHandler,
	resolveAgendaEventOccurrenceDate,
} from '@/components/agenda/agendaEventFormDialogContainerHelpers';
import {
	buildAgendaDeleteHandler,
	buildAgendaRevertHandler,
	buildFormDialogOpenChangeHandler,
	buildMarkRescheduledHandler,
	buildMarkTrialCompletedHandler,
	buildOpenCancelConfirmHandler,
} from '@/components/agenda/agendaFormDialogActions';
import type { AgendaViewDerivedState } from '@/components/agenda/agendaViewDerivedState';
import type { useAgendaUI } from '@/hooks/useAgendaUI';

type AgendaUI = ReturnType<typeof useAgendaUI>;

interface AgendaEventFormDialogContainerProps {
	ui: AgendaUI;
	derived: AgendaViewDerivedState;
	canEdit: boolean;
	canManageAgenda: boolean;
	user: User | null;
	reloadAgenda: () => void | Promise<void>;
	handleCancelLesson: () => Promise<void>;
}

export function AgendaEventFormDialogContainer(props: AgendaEventFormDialogContainerProps) {
	const input = buildAgendaEventFormDialogContainerInput(
		props.ui,
		props.derived,
		props.canEdit,
		props.canManageAgenda,
		props.reloadAgenda,
		props.handleCancelLesson,
	);
	const actionCtx = {
		ui: input.ui,
		canEdit: input.canEdit,
		canManageAgenda: input.canManageAgenda,
		user: props.user,
		reloadAgenda: input.reloadAgenda,
		handleCancelLesson: input.handleCancelLesson,
	};
	const selectedResource = input.ui.selectedEvent?.resource;

	return (
		<AgendaEventFormDialog
			open={input.ui.formDialogOpen}
			onOpenChange={buildFormDialogOpenChangeHandler(input.ui)}
			event={input.ui.editingEvent}
			initialSlot={input.ui.newEventSlot}
			onSuccess={input.reloadAgenda}
			onDelete={buildAgendaDeleteHandler(actionCtx)}
			occurrenceDate={resolveAgendaEventOccurrenceDate(input.ui.selectedEvent)}
			occurrenceParticipantIds={input.derived.occurrenceParticipantIds}
			occurrenceParticipantProfiles={input.derived.occurrenceParticipantProfiles}
			occurrenceOverrides={input.derived.occurrenceOverrides}
			occurrenceStartTime={input.derived.occurrenceTimes.start}
			occurrenceEndTime={input.derived.occurrenceTimes.end}
			deviationInfo={input.derived.deviationInfo}
			onRevert={buildAgendaRevertHandler(actionCtx)}
			readonlyParticipantIds={input.derived.readonlyParticipantIds}
			canAddParticipants={input.derived.canAddParticipants}
			lessonType={input.derived.lessonType}
			onCancelLesson={resolveAgendaCancelLessonHandler(
				selectedResource,
				input.canEdit,
				Boolean(props.user),
				input.handleCancelLesson,
			)}
			onOpenCancelConfirm={buildOpenCancelConfirmHandler(actionCtx)}
			isCancelling={input.ui.isCancelling}
			cancellationType={selectedResource?.cancellationType}
			needsReschedule={selectedResource?.needsReschedule}
			onMarkRescheduled={buildMarkRescheduledHandler(actionCtx)}
			onMarkTrialCompleted={buildMarkTrialCompletedHandler(actionCtx)}
		/>
	);
}
