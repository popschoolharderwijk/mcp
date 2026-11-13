import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { displayDayToDbDay } from '@/lib/date/day-index';
import type { AgendaSetting } from '@/lib/settings/appSettingsTypes';
import { deleteTeacherAvailability, insertTeacherAvailability } from '@/lib/teachers/teacherAvailabilityApi';
import {
	type AvailabilityDayBlockRef,
	type AvailabilitySlotWritePlan,
	type AvailabilityTimeForm,
	defaultAvailabilityTimeForm,
	isAvailabilityTimeRangeValid,
	planAvailabilitySlotWrite,
} from '@/lib/teachers/teacherAvailabilitySectionHelpers';

function getAvailabilityTimeRangeErrorMessage(): string {
	return 'Eindtijd moet na starttijd zijn';
}

async function deleteAvailabilityIds(ids: string[]): Promise<boolean> {
	for (const id of ids) {
		const { error } = await deleteTeacherAvailability(id);
		if (error) return false;
	}
	return true;
}

async function updateAvailabilityTimes(blockId: string, form: AvailabilityTimeForm): Promise<boolean> {
	const { error } = await supabase
		.from('teacher_availability')
		.update({ start_time: form.start_time, end_time: form.end_time })
		.eq('id', blockId);

	if (error) {
		console.error('Error updating availability:', error);
		toast.error('Fout bij wijzigen beschikbaarheid', {
			description: error.message,
		});
		return false;
	}

	return true;
}

async function applyAvailabilityUpdatePlan(
	plan: Extract<AvailabilitySlotWritePlan, { kind: 'update' }>,
): Promise<boolean> {
	const updated = await updateAvailabilityTimes(plan.keepId, plan.form);
	if (!updated) return false;
	return deleteAvailabilityIds(plan.deleteIds);
}

function toastAvailabilityWriteSuccess(plan: AvailabilitySlotWritePlan): void {
	if (plan.kind === 'update' && plan.deleteIds.length > 0) {
		toast.success('Beschikbaarheid samengevoegd');
		return;
	}
	if (plan.kind === 'insert') {
		toast.success('Beschikbaarheid toegevoegd');
		return;
	}
	toast.success('Beschikbaarheid bijgewerkt');
}

function planValidatedAvailabilityWrite(params: {
	form: AvailabilityTimeForm;
	dayBlocks: AvailabilityDayBlockRef[];
	movingBlockId?: string;
}): AvailabilitySlotWritePlan | null {
	if (!isAvailabilityTimeRangeValid(params.form.start_time, params.form.end_time)) {
		toast.error(getAvailabilityTimeRangeErrorMessage());
		return null;
	}
	return planAvailabilitySlotWrite({
		dayBlocks: params.dayBlocks,
		form: params.form,
		movingBlockId: params.movingBlockId,
	});
}

async function executeAvailabilityWritePlan(
	plan: AvailabilitySlotWritePlan,
	context: { teacherUserId: string; displayDay: number },
): Promise<boolean> {
	if (plan.kind === 'insert') {
		const { error } = await insertTeacherAvailability({
			teacher_user_id: context.teacherUserId,
			day_of_week: displayDayToDbDay(context.displayDay),
			start_time: plan.form.start_time,
			end_time: plan.form.end_time,
		});
		return !error;
	}
	return applyAvailabilityUpdatePlan(plan);
}

export async function addTeacherAvailabilitySlot(params: {
	teacherUserId: string;
	displayDay: number;
	form: AvailabilityTimeForm;
	dayBlocks: AvailabilityDayBlockRef[];
}): Promise<boolean> {
	const plan = planValidatedAvailabilityWrite(params);
	if (!plan) return false;

	const saved = await executeAvailabilityWritePlan(plan, {
		teacherUserId: params.teacherUserId,
		displayDay: params.displayDay,
	});
	if (!saved) return false;

	toastAvailabilityWriteSuccess(plan);
	return true;
}

export async function updateTeacherAvailabilitySlot(params: {
	blockId: string;
	form: AvailabilityTimeForm;
	dayBlocks: AvailabilityDayBlockRef[];
}): Promise<boolean> {
	const plan = planValidatedAvailabilityWrite({
		form: params.form,
		dayBlocks: params.dayBlocks,
		movingBlockId: params.blockId,
	});
	if (plan?.kind !== 'update') return false;

	const saved = await applyAvailabilityUpdatePlan(plan);
	if (!saved) return false;

	toastAvailabilityWriteSuccess(plan);
	return true;
}

export async function removeTeacherAvailabilitySlot(blockId: string): Promise<boolean> {
	const { error } = await deleteTeacherAvailability(blockId);
	if (error) return false;

	toast.success('Beschikbaarheid verwijderd');
	return true;
}

export function resetAvailabilityDialogForm(agenda?: AgendaSetting): AvailabilityTimeForm {
	return defaultAvailabilityTimeForm(agenda);
}
