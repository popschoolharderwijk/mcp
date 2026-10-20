import type { LessonAgreement } from '@/components/students/LessonAgreementItem';
import { supabase } from '@/integrations/supabase/client';
import { fetchLessonTypesByIds } from '@/lib/lesson-types/fetchLessonTypesByIds';
import { fetchTeacherProfilesByUserIds } from '@/lib/profiles/fetchTeacherProfilesByUserIds';
import { type AgreementRow, mapAgreementRow } from '@/lib/students/fetchStudentAgreementsMappers';
import type { LessonAgreementWithTeacher } from '@/types/lesson-agreements';

export async function fetchStudentAgreementsWithRelations(
	studentUserId: string,
): Promise<LessonAgreementWithTeacher[]> {
	const { data, error } = await supabase
		.from('lesson_agreements')
		.select(
			'id, day_of_week, start_time, start_date, end_date, is_active, notes, duration_minutes, frequency, teacher_user_id, lesson_type_id',
		)
		.eq('student_user_id', studentUserId)
		.order('day_of_week', { ascending: true })
		.order('start_time', { ascending: true });

	if (error) {
		throw error;
	}

	const rows = (data ?? []) as AgreementRow[];
	const teacherIds = Array.from(new Set(rows.map((r) => r.teacher_user_id)));
	const lessonTypeIds = Array.from(new Set(rows.map((r) => r.lesson_type_id)));

	const [teacherById, lessonTypeById] = await Promise.all([
		fetchTeacherProfilesByUserIds(teacherIds),
		fetchLessonTypesByIds(lessonTypeIds),
	]);

	return rows.map((row) => mapAgreementRow(row, teacherById, lessonTypeById));
}

export async function fetchStudentAgreementsForProfile(studentUserId: string): Promise<LessonAgreement[]> {
	return fetchStudentAgreementsWithRelations(studentUserId);
}
