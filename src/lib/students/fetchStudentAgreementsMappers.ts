import type { LessonAgreementWithTeacher, LessonFrequency } from '@/types/lesson-agreements';

export type AgreementRow = {
	id: string;
	day_of_week: number;
	start_time: string;
	start_date: string;
	end_date: string | null;
	is_active: boolean;
	notes: string | null;
	duration_minutes: number;
	frequency: LessonFrequency;
	teacher_user_id: string;
	lesson_type_id: string;
};

type TeacherProfile = { first_name: string | null; last_name: string | null; avatar_url: string | null };
type LessonTypeProfile = { id: string; name: string; icon: string | null; color: string | null };

export function mapAgreementRow(
	row: AgreementRow,
	teacherById: Map<string, TeacherProfile>,
	lessonTypeById: Map<string, LessonTypeProfile>,
): LessonAgreementWithTeacher {
	const teacher = teacherById.get(row.teacher_user_id);
	const lessonType = lessonTypeById.get(row.lesson_type_id);
	return {
		id: row.id,
		day_of_week: row.day_of_week,
		start_time: row.start_time,
		start_date: row.start_date,
		end_date: row.end_date,
		is_active: row.is_active,
		notes: row.notes,
		duration_minutes: row.duration_minutes,
		frequency: row.frequency,
		teacher: {
			first_name: teacher?.first_name ?? null,
			last_name: teacher?.last_name ?? null,
			avatar_url: teacher?.avatar_url ?? null,
		},
		lesson_type: {
			id: lessonType?.id ?? row.lesson_type_id,
			name: lessonType?.name ?? '',
			icon: lessonType?.icon ?? '',
			color: lessonType?.color ?? '',
		},
	};
}
