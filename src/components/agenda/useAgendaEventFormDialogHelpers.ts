import { getAgendaEventFormPermissions } from '@/components/agenda/agenda-event-form-permissions';
import type { AgendaEventFormPermissions } from '@/components/agenda/agenda-event-form-types';
import type { useAgendaEventFormActions } from '@/components/agenda/useAgendaEventFormActions';
import type {
	AgendaEventFormDialogContext,
	AgendaEventFormDialogProps,
} from '@/components/agenda/useAgendaEventFormDialog';
import type { useAgendaEventSourceSelection } from '@/components/agenda/useAgendaEventSourceSelection';
import type { useAgendaEventForm } from '@/hooks/useAgendaEventForm';

export function buildAgendaEventFormPermissions(
	props: AgendaEventFormDialogProps,
	sourceSelection: ReturnType<typeof useAgendaEventSourceSelection>,
): AgendaEventFormPermissions {
	return getAgendaEventFormPermissions({
		event: props.event,
		selectedSourceType: sourceSelection.selectedSourceType,
		effectiveSourceType: sourceSelection.effectiveSourceType,
		deviationInfo: props.deviationInfo,
		onDelete: props.onDelete,
		onRevert: props.onRevert,
		onCancelLesson: props.onCancelLesson,
		onOpenCancelConfirm: props.onOpenCancelConfirm,
		onMarkTrialCompleted: props.onMarkTrialCompleted,
	});
}

export interface AgendaEventFormDialogDefaults {
	readonlyParticipantIds: string[];
	canAddParticipants: boolean;
	isCancelling: boolean;
	isMarkingTrialCompleted: boolean;
}

export function resolveAgendaEventFormDialogDefaults(props: AgendaEventFormDialogProps): AgendaEventFormDialogDefaults {
	return {
		readonlyParticipantIds: props.readonlyParticipantIds ?? [],
		canAddParticipants: props.canAddParticipants ?? true,
		isCancelling: props.isCancelling ?? false,
		isMarkingTrialCompleted: props.isMarkingTrialCompleted ?? false,
	};
}

interface AssembleAgendaEventFormDialogContextParams {
	props: AgendaEventFormDialogProps;
	defaults: AgendaEventFormDialogDefaults;
	userId: string | undefined;
	isPrivileged: boolean;
	sourceSelection: ReturnType<typeof useAgendaEventSourceSelection>;
	formState: ReturnType<typeof useAgendaEventForm>['formState'];
	handlers: ReturnType<typeof useAgendaEventForm>['handlers'];
	saving: boolean;
	hasChanges: boolean;
	permissions: AgendaEventFormPermissions;
	actions: ReturnType<typeof useAgendaEventFormActions>;
}

export function assembleAgendaEventFormDialogContext(
	params: AssembleAgendaEventFormDialogContextParams,
): AgendaEventFormDialogContext {
	return {
		...params.props,
		userId: params.userId,
		isPrivileged: params.isPrivileged,
		readonlyParticipantIds: params.defaults.readonlyParticipantIds,
		canAddParticipants: params.defaults.canAddParticipants,
		isCancelling: params.defaults.isCancelling,
		isMarkingTrialCompleted: params.defaults.isMarkingTrialCompleted,
		sourceSelection: params.sourceSelection,
		formState: params.formState,
		handlers: params.handlers,
		saving: params.saving,
		hasChanges: params.hasChanges,
		permissions: params.permissions,
		actions: params.actions,
	};
}

export function buildAgendaEventSourceSelectionParams(props: AgendaEventFormDialogProps, isPrivileged: boolean) {
	return {
		open: props.open,
		event: props.event,
		initialProjectId: props.initialProjectId,
		isPrivileged,
	};
}

export function buildAgendaEventFormParams(
	props: AgendaEventFormDialogProps,
	defaults: AgendaEventFormDialogDefaults,
	userId: string | undefined,
	sourceSelection: ReturnType<typeof useAgendaEventSourceSelection>,
) {
	return {
		open: props.open,
		event: props.event,
		initialSlot: props.initialSlot,
		userId,
		occurrenceDate: props.occurrenceDate,
		occurrenceStartTime: props.occurrenceStartTime,
		occurrenceEndTime: props.occurrenceEndTime,
		occurrenceParticipantIds: props.occurrenceParticipantIds,
		occurrenceParticipantProfiles: props.occurrenceParticipantProfiles,
		occurrenceOverrides: props.occurrenceOverrides,
		readonlyParticipantIds: defaults.readonlyParticipantIds,
		sourceType: sourceSelection.effectiveSourceType,
		sourceId: sourceSelection.effectiveSourceId,
		onSuccess: props.onSuccess,
		onOpenChange: props.onOpenChange,
	};
}

export function buildAgendaEventFormActionsParams(
	props: AgendaEventFormDialogProps,
	userId: string | undefined,
	formState: ReturnType<typeof useAgendaEventForm>['formState'],
	permissions: AgendaEventFormPermissions,
	sourceSelection: ReturnType<typeof useAgendaEventSourceSelection>,
	handlers: ReturnType<typeof useAgendaEventForm>['handlers'],
) {
	return {
		userId,
		eventId: props.event?.id,
		selectedProjectId: sourceSelection.selectedProjectId,
		isProjectEvent: sourceSelection.isProjectEvent,
		occurrenceDate: props.occurrenceDate,
		startDate: formState.startDate,
		startTime: formState.startTime,
		permissions,
		onDelete: props.onDelete,
		onRevert: props.onRevert,
		onOpenChange: props.onOpenChange,
		onSuccess: props.onSuccess,
		performSave: handlers.performSave,
	};
}
