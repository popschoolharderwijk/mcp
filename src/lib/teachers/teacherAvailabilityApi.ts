import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { AvailabilityRoomRef } from '@/lib/teachers/teacherAvailabilitySectionHelpers';

export type TeacherAvailability = Tables<'teacher_availability'>;

export async function fetchTeacherAvailability(
	teacherUserId: string,
): Promise<{ data: TeacherAvailability[]; error: null } | { data: null; error: Error }> {
	const { data, error } = await supabase
		.from('teacher_availability')
		.select('*')
		.eq('teacher_user_id', teacherUserId)
		.order('day_of_week', { ascending: true })
		.order('start_time', { ascending: true });

	if (error) {
		console.error('Error loading availability:', error);
		toast.error('Fout bij laden beschikbaarheid');
		return { data: null, error: new Error(error.message) };
	}

	return { data: (data as TeacherAvailability[]) ?? [], error: null };
}

export async function fetchAvailabilityRooms(): Promise<
	{ data: AvailabilityRoomRef[]; error: null } | { data: null; error: Error }
> {
	const { data, error } = await supabase
		.from('rooms')
		.select('id, name, color')
		.eq('is_active', true)
		.neq('visibility', 'hidden')
		.order('name', { ascending: true });

	if (error) {
		console.error('Error loading rooms:', error);
		toast.error('Fout bij laden lokalen');
		return { data: null, error: new Error(error.message) };
	}

	return { data: data ?? [], error: null };
}

export async function insertTeacherAvailability(
	row: Pick<TeacherAvailability, 'teacher_user_id' | 'day_of_week' | 'start_time' | 'end_time' | 'room_id'>,
): Promise<{ error: Error | null }> {
	const { error } = await supabase.from('teacher_availability').insert(row).select().single();

	if (error) {
		console.error('Error adding availability:', error);
		toast.error('Fout bij toevoegen beschikbaarheid', {
			description: error.message,
		});
		return { error: new Error(error.message) };
	}

	return { error: null };
}

export async function deleteTeacherAvailability(id: string): Promise<{ error: Error | null }> {
	const { error } = await supabase.from('teacher_availability').delete().eq('id', id);

	if (error) {
		console.error('Error deleting availability:', error);
		toast.error('Fout bij verwijderen beschikbaarheid', {
			description: error.message,
		});
		return { error: new Error(error.message) };
	}

	return { error: null };
}
