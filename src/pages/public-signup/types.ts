export interface LessonType {
	id: string;
	name: string;
	icon: string;
	color: string;
	is_group_lesson: boolean;
}

export interface GroupOption {
	id: string;
	name: string;
	day_of_week: number;
	start_time: string;
	duration_minutes: number;
	frequency: string;
	teacher_name: string | null;
	members_count: number;
}

export type SignupStep = 1 | 2 | 3 | 4;

export const DAY_LABELS = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
