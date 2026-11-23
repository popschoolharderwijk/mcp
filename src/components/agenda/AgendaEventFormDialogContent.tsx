import { AgendaEventFormConfirmDialogs } from '@/components/agenda/AgendaEventFormConfirmDialogs';
import { AgendaEventFormDescription } from '@/components/agenda/AgendaEventFormDescription';
import { AgendaEventFormDialogBanners } from '@/components/agenda/AgendaEventFormDialogBanners';
import { AgendaEventFormFooter } from '@/components/agenda/AgendaEventFormFooter';
import { AgendaEventFormHeader } from '@/components/agenda/AgendaEventFormHeader';
import { AgendaEventFormParticipants } from '@/components/agenda/AgendaEventFormParticipants';
import { AgendaEventFormProjectSourceField } from '@/components/agenda/AgendaEventFormProjectSourceField';
import { AgendaEventFormSchedule } from '@/components/agenda/AgendaEventFormSchedule';
import type { AgendaEventFormDialogContext } from '@/components/agenda/useAgendaEventFormDialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface AgendaEventFormDialogContentProps {
	ctx: AgendaEventFormDialogContext;
}

export function AgendaEventFormDialogContent({ ctx }: AgendaEventFormDialogContentProps) {
	const {
		open,
		onOpenChange,
		event,
		onOpenCancelConfirm,
		onCancelLesson,
		onMarkTrialCompleted,
		userId,
		readonlyParticipantIds,
		canAddParticipants,
		isCancelling,
		isMarkingTrialCompleted,
		formState,
		handlers,
		saving,
		hasChanges,
		permissions,
		actions,
	} = ctx;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
				<form onSubmit={actions.handleSubmit} className="space-y-4 pt-2">
					<AgendaEventFormHeader
						isLessonEvent={permissions.isLessonEvent}
						isLessonGroupEvent={permissions.isLessonGroupEvent}
						lessonType={ctx.lessonType}
						color={formState.color}
						setColor={formState.setColor}
						title={formState.title}
						setTitle={formState.setTitle}
						isCancelledEvent={permissions.isCancelledEvent}
						isNewEvent={!event}
					/>

					<AgendaEventFormProjectSourceField ctx={ctx} />

					<AgendaEventFormDescription
						showDescription={formState.showDescription}
						setShowDescription={formState.setShowDescription}
						description={formState.description}
						setDescription={formState.setDescription}
						isCancelledEvent={permissions.isCancelledEvent}
					/>

					<AgendaEventFormSchedule
						startDate={formState.startDate}
						setStartDate={formState.setStartDate}
						setEndDate={formState.setEndDate}
						startTime={formState.startTime}
						setStartTime={formState.setStartTime}
						endTime={formState.endTime}
						setEndTime={formState.setEndTime}
						isAllDay={formState.isAllDay}
						setIsAllDay={formState.setIsAllDay}
						recurring={formState.recurring}
						setRecurring={formState.setRecurring}
						recurringFrequency={formState.recurringFrequency}
						setRecurringFrequency={formState.setRecurringFrequency}
						recurringEndDate={formState.recurringEndDate}
						setRecurringEndDate={formState.setRecurringEndDate}
						isCancelledEvent={permissions.isCancelledEvent}
					/>

					<AgendaEventFormParticipants
						participantIds={formState.participantIds}
						participantProfiles={formState.participantProfiles}
						participantAddId={formState.participantAddId}
						setParticipantAddId={formState.setParticipantAddId}
						onAddParticipant={handlers.handleAddParticipant}
						onRemoveParticipant={handlers.handleRemoveParticipant}
						ownerUserId={event?.owner_user_id}
						currentUserId={userId}
						readonlyParticipantIds={readonlyParticipantIds}
						canAddParticipants={canAddParticipants}
						isCancelledEvent={permissions.isCancelledEvent}
						onCloseDialog={() => onOpenChange(false)}
					/>

					<AgendaEventFormDialogBanners ctx={ctx} />

					<AgendaEventFormFooter
						permissions={permissions}
						saving={saving}
						reverting={actions.reverting}
						isCancelling={isCancelling}
						isMarkingTrialCompleted={isMarkingTrialCompleted}
						hasChanges={hasChanges}
						isEditing={Boolean(event)}
						onDeleteClick={actions.handleDeleteClick}
						onOpenCancelConfirm={onOpenCancelConfirm}
						onCancelLesson={onCancelLesson}
						onMarkTrialCompleted={onMarkTrialCompleted}
						onClose={() => onOpenChange(false)}
					/>
				</form>

				<AgendaEventFormConfirmDialogs
					eventTitle={event?.title}
					deleteConfirmOpen={actions.deleteConfirmOpen}
					setDeleteConfirmOpen={actions.setDeleteConfirmOpen}
					deleteRecurrenceOpen={actions.deleteRecurrenceOpen}
					setDeleteRecurrenceOpen={actions.setDeleteRecurrenceOpen}
					editRecurrenceOpen={actions.editRecurrenceOpen}
					setEditRecurrenceOpen={actions.setEditRecurrenceOpen}
					onDeleteConfirm={() => void actions.handleDeleteConfirm()}
					onDeleteRecurrence={(scope) => void actions.handleDeleteRecurrence(scope)}
					onEditRecurrence={(scope) => void handlers.performSave(scope)}
				/>
			</DialogContent>
		</Dialog>
	);
}
