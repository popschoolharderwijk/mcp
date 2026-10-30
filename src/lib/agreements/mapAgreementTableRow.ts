import type { AgreementTableRow, LessonFrequency } from '@/types/lesson-agreements';
import type { User } from '@/types/users';

type AgreementProfile = Pick<User, 'first_name' | 'last_name' | 'avatar_url' | 'email'>;

export type RawAgreementRow = {
	id: string;
	created_at: string;
	day_of_week: number;
	start_time: string;
	start_date: string;
	end_date: string | null;
	is_active: boolean;
	notes: string | null;
	student_user_id: string;
	teacher_user_id: string;
	lesson_type_id: string;
	duration_minutes: number;
	frequency: LessonFrequency;
	price_per_lesson: number;
	duo_pair_id: string | null;
	lesson_types:
		| { id: string; name: string; icon: string; color: string }
		| { id: string; name: string; icon: string; color: string }[]
		| null;
	teachers: { user_id: string } | { user_id: string }[] | null;
};

function unwrapJoined<T>(value: T | T[] | null | undefined): T | null {
	if (!value) return null;
	return Array.isArray(value) ? (value[0] ?? null) : value;
}

const EMPTY_PROFILE: AgreementProfile = {
	first_name: null,
	last_name: null,
	avatar_url: null,
	email: '',
};

export function mapRawAgreementToTableRow(
	a: RawAgreementRow,
	profileMap: Map<string, AgreementProfile>,
	emptyStudent: AgreementProfile = EMPTY_PROFILE,
	emptyTeacher: AgreementProfile = EMPTY_PROFILE,
): AgreementTableRow {
	const teacherRef = unwrapJoined(a.teachers);
	const lt = unwrapJoined(a.lesson_types);
	const studentProfile = profileMap.get(a.student_user_id);
	const teacherProfile = profileMap.get(teacherRef?.user_id ?? '');

	return {
		id: a.id,
		created_at: a.created_at,
		day_of_week: a.day_of_week,
		start_time: a.start_time,
		start_date: a.start_date,
		end_date: a.end_date,
		is_active: a.is_active,
		notes: a.notes,
		student_user_id: a.student_user_id,
		teacher_user_id: a.teacher_user_id,
		lesson_type_id: a.lesson_type_id,
		duration_minutes: a.duration_minutes,
		frequency: a.frequency,
		price_per_lesson: a.price_per_lesson,
		duo_pair_id: a.duo_pair_id,
		student: studentProfile ?? emptyStudent,
		teacher: teacherProfile ?? emptyTeacher,
		lesson_type: {
			id: lt?.id ?? a.lesson_type_id,
			name: lt?.name ?? '',
			icon: lt?.icon ?? '',
			color: lt?.color ?? '',
		},
	};
}
