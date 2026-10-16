import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import type { DeleteScope } from '@/components/agenda/AgendaEventFormDialog';
import type { CalendarEvent } from '@/components/agenda/types';
import type { useAgendaUI } from '@/hooks/useAgendaUI';
import { supabase } from '@/integrations/supabase/client';
import { deleteAgendaEvent } from '@/lib/agenda/deleteAgendaEvent';
import { getRevertibleMergedSlotMembers } from '@/lib/agenda/mergeSameSlotLessonEvents';
import { needsRecurrenceChoice } from '@/lib/agenda/needsRecurrenceChoice';
import { notifyAgendaOpResult } from '@/lib/agenda/notifyAgendaOpResult';
import { revertMergedSlotLessons } from '@/lib/agenda/revertMergedSlotLessons';

type AgendaUI = ReturnType<typeof useAgendaUI>;

interface ActionContext {
	ui: AgendaUI;
	canEdit: boolean;
	canManageAgenda: boolean;
	user: User | null;
	reloadAgenda: () => void | Promise<void>;
	handleCancelLesson: () => Promise<void>;
}

export function buildAgendaDeleteHandler(ctx: ActionContext) {
	const { canManageAgenda, user, reloadAgenda } = ctx;
	if (!canManageAgenda || !user) return undefined;
	return async (eventId: string, scope: DeleteScope, occurrenceDate?: string) => {
		await notifyAgendaOpResult(
			await deleteAgendaEvent({ eventId, scope, occurrenceDate, userId: user.id }),
			reloadAgenda,
			{ throwOnError: true },
		);
	};
}

function hasSingleEventRevertTarget(resource: NonNullable<AgendaUI['selectedEvent']>['resource']): boolean {
	return (
		Boolean(resource.isDeviation || resource.isCancelled) &&
		Boolean(resource.deviationId && resource.eventId && resource.originalDate)
	);
}

function canRevertDeviation(ui: AgendaUI, canManageAgenda: boolean, user: User | null): boolean {
	const resource = ui.selectedEvent?.resource;
	if (!resource || !canManageAgenda || !user) return false;
	return (
		getRevertibleMergedSlotMembers(resource.mergedSlotMembers).length > 0 || hasSingleEventRevertTarget(resource)
	);
}

export function buildAgendaRevertHandler(ctx: ActionContext) {
	if (!canRevertDeviation(ctx.ui, ctx.canManageAgenda, ctx.user)) return undefined;
	const selected = ctx.ui.selectedEvent;
	if (!selected) return undefined;
	const eventId = selected.resource.eventId;
	const originalDate = selected.resource.originalDate;
	const mergedSlotMembers = selected.resource.mergedSlotMembers;
	if (!eventId && getRevertibleMergedSlotMembers(mergedSlotMembers).length === 0) return undefined;
	return async () => {
		await notifyAgendaOpResult(
			await revertMergedSlotLessons(
				mergedSlotMembers,
				eventId && originalDate ? { eventId, originalDate } : undefined,
			),
			ctx.reloadAgenda,
			{ throwOnError: true },
		);
	};
}

export function buildOpenCancelConfirmHandler(ctx: ActionContext) {
	const { ui, canEdit, user } = ctx;
	if (!ui.selectedEvent || ui.selectedEvent.resource.isCancelled || !canEdit || !user) return undefined;
	return () => {
		if (needsRecurrenceChoice(ui.selectedEvent as CalendarEvent)) {
			ui.setRecurrenceChoiceAction('cancel');
			ui.setRecurrenceChoiceOpen(true);
			return;
		}
		ui.setCancelLessonConfirmOpen(true);
	};
}

export function buildMarkRescheduledHandler(ctx: ActionContext) {
	const { ui, canEdit, user, reloadAgenda } = ctx;
	const resource = ui.selectedEvent?.resource;
	if (!resource?.needsReschedule || !resource.deviationId || !canEdit || !user) return undefined;
	const deviationId = resource.deviationId;
	return async () => {
		const { error } = await supabase
			.from('agenda_event_deviations')
			.update({ needs_reschedule: false })
			.eq('id', deviationId);
		if (error) {
			toast.error('Fout bij markeren als ingehaald');
			return;
		}
		toast.success('Les gemarkeerd als ingehaald');
		await reloadAgenda();
	};
}

export function buildMarkTrialCompletedHandler(ctx: ActionContext) {
	const { ui, canEdit, user, reloadAgenda } = ctx;
	if (ui.editingEvent?.source_type !== 'trial_lesson' || !ui.editingEvent.source_id || !canEdit || !user) {
		return undefined;
	}
	const trialId = ui.editingEvent.source_id;
	return async () => {
		const { error } = await supabase.rpc('mark_trial_lesson_completed', { _trial_id: trialId });
		if (error) {
			toast.error(
				error.message === 'invalid_status_transition'
					? 'Deze proefles kan niet meer als gegeven worden gemarkeerd'
					: 'Kon proefles niet markeren als gegeven',
			);
			return;
		}
		toast.success('Proefles gemarkeerd als gegeven');
		ui.setFormDialogOpen(false);
		await reloadAgenda();
	};
}

export function buildFormDialogOpenChangeHandler(ui: AgendaUI) {
	return (open: boolean) => {
		ui.setFormDialogOpen(open);
		if (!open) {
			ui.setEditingEvent(null);
			ui.setNewEventSlot(null);
			ui.setSelectedEvent(null);
		}
	};
}
