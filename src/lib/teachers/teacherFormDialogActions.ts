import { supabase } from '@/integrations/supabase/client';
import { diffLessonTypeIds, type TeacherFormState } from '@/lib/teachers/teacherFormDialogHelpers';
import { normalizeCompactTextOrNull, normalizeTrimmedTextOrNull } from '@/lib/text/normalizeText';

export async function createTeacherRecord(userId: string, form: TeacherFormState): Promise<{ user_id: string } | null> {
	const { data, error } = await supabase
		.from('teachers')
		.insert({
			user_id: userId,
			bio: normalizeTrimmedTextOrNull(form.bio),
			is_active: true,
		})
		.select('user_id')
		.single();

	if (error || !data) return null;
	return data;
}

export async function linkTeacherLessonTypes(teacherUserId: string, lessonTypeIds: string[]): Promise<string | null> {
	if (lessonTypeIds.length === 0) return null;

	const lessonTypeLinks = lessonTypeIds.map((lesson_type_id) => ({
		teacher_user_id: teacherUserId,
		lesson_type_id,
	}));

	const { error } = await supabase.from('teacher_lesson_types').insert(lessonTypeLinks);
	return error?.message ?? null;
}

export async function updateTeacherBio(teacherUserId: string, bio: string): Promise<string | null> {
	const { error } = await supabase
		.from('teachers')
		.update({ bio: normalizeTrimmedTextOrNull(bio) })
		.eq('user_id', teacherUserId);
	return error?.message ?? null;
}

export async function updateTeacherProfileFields(
	teacherUserId: string,
	form: TeacherFormState,
): Promise<string | null> {
	const { error } = await supabase
		.from('profiles')
		.update({
			first_name: normalizeCompactTextOrNull(form.first_name),
			last_name: normalizeCompactTextOrNull(form.last_name),
			phone_number: normalizeTrimmedTextOrNull(form.phone_number),
		})
		.eq('user_id', teacherUserId);
	return error?.message ?? null;
}

export async function syncTeacherLessonTypes(
	teacherUserId: string,
	lessonTypeIds: string[],
): Promise<{ addError: string | null; removeError: string | null }> {
	const { data: currentLinks } = await supabase
		.from('teacher_lesson_types')
		.select('lesson_type_id')
		.eq('teacher_user_id', teacherUserId);

	const { toAdd, toRemove } = diffLessonTypeIds(
		(currentLinks ?? []).map((link) => link.lesson_type_id),
		lessonTypeIds,
	);

	let addError: string | null = null;
	let removeError: string | null = null;

	if (toAdd.length > 0) {
		const linksToAdd = toAdd.map((lesson_type_id) => ({
			teacher_user_id: teacherUserId,
			lesson_type_id,
		}));
		const { error } = await supabase.from('teacher_lesson_types').insert(linksToAdd);
		addError = error?.message ?? null;
	}

	if (toRemove.length > 0) {
		const { error } = await supabase
			.from('teacher_lesson_types')
			.delete()
			.eq('teacher_user_id', teacherUserId)
			.in('lesson_type_id', toRemove);
		removeError = error?.message ?? null;
	}

	return { addError, removeError };
}
