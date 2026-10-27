import { supabase } from '@/integrations/supabase/client';

export async function countLessonAgreementsByTeacherUserId(teacherUserId: string): Promise<number> {
	const { count, error } = await supabase
		.from('lesson_agreements')
		.select('*', { count: 'exact', head: true })
		.eq('teacher_user_id', teacherUserId);

	if (error) {
		console.error('Error counting teacher lesson agreements:', error);
		return 0;
	}

	return count ?? 0;
}
