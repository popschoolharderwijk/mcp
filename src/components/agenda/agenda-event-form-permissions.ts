import type { AgendaEventFormPermissions } from '@/components/agenda/agenda-event-form-types';
import type { AgendaEventRow, DeleteScope, DeviationInfo } from '@/types/agenda-events';

interface GetAgendaEventFormPermissionsParams {
	event?: AgendaEventRow | null;
	selectedSourceType: AgendaEventRow['source_type'];
	effectiveSourceType: AgendaEventRow['source_type'];
	deviationInfo?: DeviationInfo | null;
	onDelete?: (eventId: string, scope: DeleteScope, occurrenceDate?: string) => void | Promise<void>;
	onRevert?: () => void | Promise<void>;
	onCancelLesson?: () => void;
	onOpenCancelConfirm?: () => void;
	onMarkTrialCompleted?: () => void | Promise<void>;
}

function resolveAgendaEventTypeFlags(
	event: AgendaEventRow | null | undefined,
	selectedSourceType: AgendaEventRow['source_type'],
	effectiveSourceType: AgendaEventRow['source_type'],
) {
	return {
		isManualEvent: (event?.source_type ?? selectedSourceType) === 'manual',
		isLessonEvent: event?.source_type === 'lesson_agreement',
		isLessonGroupEvent: event?.source_type === 'lesson_group',
		isProjectEvent: effectiveSourceType === 'project',
		isRecurringEvent: !!event?.recurring,
		isTrialEvent: event?.source_type === 'trial_lesson',
	};
}

function canDeleteAgendaEvent(input: {
	isManualEvent: boolean;
	isProjectEvent: boolean;
	eventId: string | undefined;
	onDelete?: GetAgendaEventFormPermissionsParams['onDelete'];
	isCancelledEvent: boolean;
}): boolean {
	return (
		(input.isManualEvent || input.isProjectEvent) && !!input.eventId && !!input.onDelete && !input.isCancelledEvent
	);
}

function canCancelAgendaLesson(input: {
	isLessonEvent: boolean;
	isLessonGroupEvent: boolean;
	eventId: string | undefined;
	onCancelLesson?: GetAgendaEventFormPermissionsParams['onCancelLesson'];
	onOpenCancelConfirm?: GetAgendaEventFormPermissionsParams['onOpenCancelConfirm'];
}): boolean {
	return (
		(input.isLessonEvent || input.isLessonGroupEvent) &&
		!!input.eventId &&
		!!(input.onCancelLesson || input.onOpenCancelConfirm)
	);
}

function canMarkTrialLessonCompleted(
	isTrialEvent: boolean,
	isCancelledEvent: boolean,
	onMarkTrialCompleted?: GetAgendaEventFormPermissionsParams['onMarkTrialCompleted'],
): boolean {
	return isTrialEvent && !isCancelledEvent && !!onMarkTrialCompleted;
}

function resolveAgendaEventActionFlags(input: {
	event: AgendaEventRow | null | undefined;
	deviationInfo?: DeviationInfo | null;
	typeFlags: ReturnType<typeof resolveAgendaEventTypeFlags>;
	onDelete?: GetAgendaEventFormPermissionsParams['onDelete'];
	onRevert?: GetAgendaEventFormPermissionsParams['onRevert'];
	onCancelLesson?: GetAgendaEventFormPermissionsParams['onCancelLesson'];
	onOpenCancelConfirm?: GetAgendaEventFormPermissionsParams['onOpenCancelConfirm'];
	onMarkTrialCompleted?: GetAgendaEventFormPermissionsParams['onMarkTrialCompleted'];
}) {
	const isCancelledEvent = !!input.deviationInfo?.isCancelled;
	const { isManualEvent, isProjectEvent, isLessonEvent, isLessonGroupEvent, isTrialEvent } = input.typeFlags;
	return {
		isCancelledEvent,
		canDelete: canDeleteAgendaEvent({
			isManualEvent,
			isProjectEvent,
			eventId: input.event?.id,
			onDelete: input.onDelete,
			isCancelledEvent,
		}),
		canRevert: !!input.deviationInfo && !!input.onRevert,
		canCancelLesson: canCancelAgendaLesson({
			isLessonEvent,
			isLessonGroupEvent,
			eventId: input.event?.id,
			onCancelLesson: input.onCancelLesson,
			onOpenCancelConfirm: input.onOpenCancelConfirm,
		}),
		canMarkTrialCompleted: canMarkTrialLessonCompleted(isTrialEvent, isCancelledEvent, input.onMarkTrialCompleted),
	};
}

export function getAgendaEventFormPermissions({
	event,
	selectedSourceType,
	effectiveSourceType,
	deviationInfo,
	onDelete,
	onRevert,
	onCancelLesson,
	onOpenCancelConfirm,
	onMarkTrialCompleted,
}: GetAgendaEventFormPermissionsParams): AgendaEventFormPermissions {
	const typeFlags = resolveAgendaEventTypeFlags(event, selectedSourceType, effectiveSourceType);
	const actionFlags = resolveAgendaEventActionFlags({
		event,
		deviationInfo,
		typeFlags,
		onDelete,
		onRevert,
		onCancelLesson,
		onOpenCancelConfirm,
		onMarkTrialCompleted,
	});

	return {
		...typeFlags,
		...actionFlags,
	};
}
