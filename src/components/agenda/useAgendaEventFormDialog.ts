import type { AgendaEventFormPermissions } from '@/components/agenda/agenda-event-form-types';
import { useAgendaEventFormActions } from '@/components/agenda/useAgendaEventFormActions';
import {
	assembleAgendaEventFormDialogContext,
	buildAgendaEventFormActionsParams,
	buildAgendaEventFormParams,
	buildAgendaEventFormPermissions,
	buildAgendaEventSourceSelectionParams,
	resolveAgendaEventFormDialogDefaults,
} from '@/components/agenda/useAgendaEventFormDialogHelpers';
import { useAgendaEventSourceSelection } from '@/components/agenda/useAgendaEventSourceSelection';
import { type OccurrenceOverrides, useAgendaEventForm } from '@/hooks/useAgendaEventForm';
import { useAuth } from '@/hooks/useAuth';
import type { AgendaEventRow, CancellationType, DeleteScope, DeviationInfo } from '@/types/agenda-events';

export interface AgendaEventFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	event?: AgendaEventRow | null;
	initialSlot?: { start: Date; end: Date } | null;
	onSuccess?: () => void;
	onDelete?: (eventId: string, scope: DeleteScope, occurrenceDate?: string) => void | Promise<void>;
	deviationInfo?: DeviationInfo | null;
	onRevert?: () => void | Promise<void>;
	occurrenceDate?: string | null;
	occurrenceStartTime?: string | null;
	occurrenceEndTime?: string | null;
	occurrenceParticipantIds?: string[] | null;
	occurrenceParticipantProfiles?: Record<
		string,
		{ first_name: string | null; last_name: string | null; email: string | null }
	> | null;
	occurrenceOverrides?: OccurrenceOverrides | null;
	readonlyParticipantIds?: string[];
	canAddParticipants?: boolean;
	lessonType?: { name: string; icon?: string | null; color?: string | null } | null;
	initialProjectId?: string | null;
	onCancelLesson?: () => void;
	onOpenCancelConfirm?: () => void;
	isCancelling?: boolean;
	cancellationType?: CancellationType;
	needsReschedule?: boolean;
	onMarkRescheduled?: () => void;
	onMarkTrialCompleted?: () => void | Promise<void>;
	isMarkingTrialCompleted?: boolean;
}

interface AgendaEventFormDialogContext extends AgendaEventFormDialogProps {
	userId: string | undefined;
	isPrivileged: boolean;
	readonlyParticipantIds: string[];
	canAddParticipants: boolean;
	isCancelling: boolean;
	isMarkingTrialCompleted: boolean;
	sourceSelection: ReturnType<typeof useAgendaEventSourceSelection>;
	formState: ReturnType<typeof useAgendaEventForm>['formState'];
	handlers: ReturnType<typeof useAgendaEventForm>['handlers'];
	saving: boolean;
	hasChanges: boolean;
	permissions: AgendaEventFormPermissions;
	actions: ReturnType<typeof useAgendaEventFormActions>;
}

export function useAgendaEventFormDialog(props: AgendaEventFormDialogProps): AgendaEventFormDialogContext {
	const { user, isPrivileged } = useAuth();
	const sourceSelection = useAgendaEventSourceSelection(buildAgendaEventSourceSelectionParams(props, isPrivileged));
	const defaults = resolveAgendaEventFormDialogDefaults(props);
	const { formState, handlers, saving, hasChanges } = useAgendaEventForm(
		buildAgendaEventFormParams(props, defaults, user?.id, sourceSelection),
	);
	const permissions = buildAgendaEventFormPermissions(props, sourceSelection);
	const actions = useAgendaEventFormActions(
		buildAgendaEventFormActionsParams(props, user?.id, formState, permissions, sourceSelection, handlers),
	);

	return assembleAgendaEventFormDialogContext({
		props,
		defaults,
		userId: user?.id,
		isPrivileged,
		sourceSelection,
		formState,
		handlers,
		saving,
		hasChanges,
		permissions,
		actions,
	});
}

export type { AgendaEventFormDialogContext };
