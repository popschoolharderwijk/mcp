import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { displayDayToDbDay } from '@/lib/date/day-index';
import type { AgendaSetting } from '@/lib/settings/appSettingsTypes';
import { deleteTeacherAvailability, insertTeacherAvailability } from '@/lib/teachers/teacherAvailabilityApi';
import {
	type AvailabilityTimeForm,
	defaultAvailabilityTimeForm,
	isAvailabilityTimeRangeValid,
} from '@/lib/teachers/teacherAvailabilitySectionHelpers';

function getAvailabilityTimeRangeErrorMessage(): string {
	return 'Eindtijd moet na starttijd zijn';
}

export async function addTeacherAvailabilitySlot(params: {
	teacherUserId: string;
	displayDay: number;
	form: AvailabilityTimeForm;
}): Promise<boolean> {
	if (!isAvailabilityTimeRangeValid(params.form.start_time, params.form.end_time)) {
		toast.error(getAvailabilityTimeRangeErrorMessage());
		return false;
	}

	const { error } = await insertTeacherAvailability({
		teacher_user_id: params.teacherUserId,
		day_of_week: displayDayToDbDay(params.displayDay),
		start_time: params.form.start_time,
		end_time: params.form.end_time,
	});

	if (error) return false;

	toast.success('Beschikbaarheid toegevoegd');
	return true;
}

export async function updateTeacherAvailabilitySlot(params: {
	blockId: string;
	form: AvailabilityTimeForm;
}): Promise<boolean> {
	if (!isAvailabilityTimeRangeValid(params.form.start_time, params.form.end_time)) {
		toast.error(getAvailabilityTimeRangeErrorMessage());
		return false;
	}

	const { error } = await supabase
		.from('teacher_availability')
		.update({ start_time: params.form.start_time, end_time: params.form.end_time })
		.eq('id', params.blockId);

	if (error) {
		console.error('Error updating availability:', error);
		toast.error('Fout bij wijzigen beschikbaarheid', {
			description: error.message,
		});
		return false;
	}

	toast.success('Beschikbaarheid bijgewerkt');
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
