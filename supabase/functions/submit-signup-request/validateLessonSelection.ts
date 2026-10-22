import type { SupabaseClient } from '@supabase/supabase-js';
import type { SignupRequest } from './types.ts';
import {
	validateActiveLessonType,
	validateLessonGroupForSignup,
	validateLessonTypeOptionForSignup,
} from './validateLessonSelectionHelpers.ts';

export async function validateLessonSelection(
	supabase: SupabaseClient,
	body: SignupRequest,
): Promise<
	| { ok: true; lessonType: { id: string; is_active: boolean; is_group_lesson: boolean }; optionId: string | null }
	| { ok: false; response: Response }
> {
	const { data: lt } = await supabase
		.from('lesson_types')
		.select('id, is_active, is_group_lesson')
		.eq('id', body.lesson_type_id)
		.single();

	const lessonTypeError = validateActiveLessonType(lt);
	if (lessonTypeError) return { ok: false, response: lessonTypeError };

	if (body.lesson_group_id) {
		const { data: lg } = await supabase
			.from('lesson_groups')
			.select('id, lesson_type_id, is_active')
			.eq('id', body.lesson_group_id)
			.single();
		const groupError = validateLessonGroupForSignup(lg, body.lesson_type_id);
		if (groupError) return { ok: false, response: groupError };
	}

	let optionId: string | null = null;
	if (body.lesson_type_option_id) {
		const { data: opt } = await supabase
			.from('lesson_type_options')
			.select('id, lesson_type_id')
			.eq('id', body.lesson_type_option_id)
			.single();
		const optionError = validateLessonTypeOptionForSignup(
			lt as { is_group_lesson: boolean },
			opt,
			body.lesson_type_id,
		);
		if (optionError) return { ok: false, response: optionError };
		optionId = opt?.id ?? null;
	}

	return { ok: true, lessonType: lt as { id: string; is_active: boolean; is_group_lesson: boolean }, optionId };
}
