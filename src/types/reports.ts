export type ReportSourceType = 'lesson' | 'project';

export interface ReportRow {
	source_type: ReportSourceType;
	teacher_user_id: string;
	teacher_name: string;
	lesson_type_id: string | null;
	lesson_type_name: string | null;
	lesson_type_color: string | null;
	lesson_type_icon: string | null;
	age_category: 'youth' | 'adult' | 'unknown';
	total_minutes: number;
	lesson_count: number;
	duo_perspective: 'teacher_block' | 'student_lesson' | null;
	project_id: string | null;
	project_name: string | null;
}

export interface ReportLessonTypeOption {
	id: string;
	label: string;
	icon: string;
	color: string;
}

export interface ReportSummary {
	totalMinutes: number;
	totalLessons: number;
	youthMinutes: number;
	adultMinutes: number;
	projectMinutes: number;
}

export interface ReportTableFilters {
	sourceType: string | null;
	lessonTypeId: string | null;
	ageCategory: string | null;
}

export const DUO_PERSPECTIVE_LABELS: Record<'teacher_block' | 'student_lesson', string> = {
	teacher_block: 'docent-blokken',
	student_lesson: 'per leerling',
};

export const AGE_LABELS: Record<string, string> = {
	youth: 'Jongeren',
	adult: 'Volwassenen',
	unknown: 'Onbekend',
};
