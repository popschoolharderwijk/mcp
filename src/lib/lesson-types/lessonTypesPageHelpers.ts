import type { SupabaseClient } from '@supabase/supabase-js';
import { buildOptionsCountMap } from '@/lib/lesson-types/lessonTypesPageMappers';

export interface LessonTypeListItem {
	id: string;
	name: string;
	description: string | null;
	icon: string;
	color: string;
	cost_center: string | null;
	is_group_lesson: boolean;
	is_active: boolean;
	created_at: string;
	updated_at: string;
	options_count?: number;
}

export async function fetchLessonTypesWithOptionCounts(
	client: SupabaseClient,
): Promise<{ lessonTypes: LessonTypeListItem[]; error: string | null }> {
	const { data, error } = await client.from('lesson_types').select('*').order('name', { ascending: true });
	if (error) {
		return { lessonTypes: [], error: error.message };
	}

	const types = data ?? [];
	if (!types.length) {
		return { lessonTypes: [], error: null };
	}

	const { data: optionRows, error: optionsError } = await client
		.from('lesson_type_options')
		.select('lesson_type_id')
		.in(
			'lesson_type_id',
			types.map((type) => type.id),
		);
	if (optionsError) {
		return { lessonTypes: [], error: optionsError.message };
	}

	const countMap = buildOptionsCountMap(optionRows ?? []);
	return {
		lessonTypes: types.map((type) => ({
			...type,
			options_count: countMap.get(type.id) ?? 0,
		})),
		error: null,
	};
}

export function translateLessonTypeDeleteError(message: string): string {
	if (message.includes('Cannot delete lesson type')) {
		return 'Kan lestype niet verwijderen: er zijn bestaande lesovereenkomsten die dit lestype gebruiken';
	}
	return message;
}
