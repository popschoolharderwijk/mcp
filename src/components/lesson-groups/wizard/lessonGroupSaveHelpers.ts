import type { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import type { LessonGroupFormState } from '@/components/lesson-groups/wizard/lessonGroupWizardTypes';
import type { SlotWithStatus } from '@/lib/agreementSlots';
import { addDaysToDateStr } from '@/lib/date/date-format';

export function normalizeLessonGroupStartTime(startTime: string): string {
	return startTime.includes(':') ? startTime : `${startTime}:00`;
}

function computeLessonGroupEndTime(startTime: string, durationMinutes: number): string {
	const [h, m] = startTime.split(':').map(Number);
	const total = h * 60 + (m ?? 0) + durationMinutes;
	const eh = Math.floor(total / 60) % 24;
	const em = total % 60;
	return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`;
}

function computeLessonGroupFirstOccurrenceDate(startDate: string, dayOfWeek: number): string {
	const start = new Date(`${startDate}T12:00:00`);
	const offset = (dayOfWeek - start.getDay() + 7) % 7;
	return addDaysToDateStr(startDate, offset);
}

export function buildLessonGroupDbPayload(form: LessonGroupFormState, slot: SlotWithStatus, startTime: string) {
	return {
		name: form.name.trim(),
		lesson_type_id: form.lessonTypeId,
		teacher_user_id: form.teacherUserId,
		duration_minutes: form.durationMinutes,
		frequency: form.frequency,
		day_of_week: slot.day_of_week,
		start_time: startTime,
		start_date: form.startDate,
		end_date: form.endDate || null,
		is_active: true,
	};
}

export async function persistLessonGroupRecord(
	supabase: SupabaseClient,
	isEditMode: boolean,
	groupId: string | undefined,
	payload: ReturnType<typeof buildLessonGroupDbPayload>,
): Promise<string> {
	if (isEditMode && groupId) {
		const { error } = await supabase.from('lesson_groups').update(payload).eq('id', groupId);
		if (error) throw error;
		return groupId;
	}

	const { data, error } = await supabase.from('lesson_groups').insert(payload).select('id').single();
	if (error) throw error;
	return data.id;
}

export async function approveSelectedSignupRequests(
	supabase: SupabaseClient,
	groupId: string,
	requestIds: string[],
): Promise<void> {
	if (requestIds.length === 0) return;
	const results = await Promise.all(
		requestIds.map((requestId) =>
			supabase.functions.invoke('approve-signup-request', {
				body: { request_id: requestId, override_lesson_group_id: groupId },
			}),
		),
	);
	const failed = results.filter((result) => result.error).length;
	if (failed > 0) {
		toast.error(`Kon ${failed} aanmelding(en) niet goedkeuren`);
	}
}

export async function scheduleLessonGroupInAgenda(
	supabase: SupabaseClient,
	groupId: string,
	form: LessonGroupFormState,
	slot: SlotWithStatus,
	startTime: string,
	teacherUserId: string,
): Promise<void> {
	const firstDateStr = computeLessonGroupFirstOccurrenceDate(form.startDate, slot.day_of_week);
	const endTimeStr = computeLessonGroupEndTime(startTime, form.durationMinutes);
	const { error } = await supabase.from('agenda_events').insert({
		source_type: 'lesson_group',
		source_id: groupId,
		owner_user_id: teacherUserId,
		title: form.name.trim(),
		start_date: firstDateStr,
		start_time: startTime,
		end_date: firstDateStr,
		end_time: endTimeStr,
		is_all_day: false,
		recurring: true,
		recurring_frequency: form.frequency,
		recurring_end_date: form.endDate || null,
	});
	if (error) {
		toast.error('Lesgroep opgeslagen, maar inplannen mislukt', { description: error.message });
	}
}
