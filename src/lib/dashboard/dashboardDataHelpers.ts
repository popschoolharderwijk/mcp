import { getDisplayName } from '@/lib/display-name';
import {
	flattenStudentWithAgreements,
	type PaginatedStudentsResponseRaw,
	type StudentWithAgreements,
} from '@/types/students';

export interface DashboardStats {
	totalStudents: number;
	activeAgreements: number;
	inactiveAgreements: number;
	openSignupRequests: number;
	activeTeachers: number;
	availableSlots: number;
	activeLessonTypes: number;
}

export interface DashboardStudent {
	user_id: string;
	display_name: string;
	email: string;
	avatar_url: string | null;
	status: string;
	created_at: string;
}

export interface DashboardTeacher {
	user_id: string;
	display_name: string;
	avatar_url: string | null;
	lessonTypeNames: string[];
	availableSlotCount: number;
}

export interface DashboardCountResults {
	studentsCount: number | null;
	activeAgreementsCount: number | null;
	totalAgreementsCount: number | null;
	openSignupRequestsCount: number | null;
	teachersCount: number | null;
	slotsCount: number | null;
	lessonTypesCount: number | null;
}

export interface DashboardDataLoadResult {
	stats: DashboardStats;
	recentStudents: DashboardStudent[];
	teachers: DashboardTeacher[];
}

export function buildDashboardStats(counts: DashboardCountResults): DashboardStats {
	return {
		totalStudents: counts.studentsCount ?? 0,
		activeAgreements: counts.activeAgreementsCount ?? 0,
		inactiveAgreements: (counts.totalAgreementsCount ?? 0) - (counts.activeAgreementsCount ?? 0),
		openSignupRequests: counts.openSignupRequestsCount ?? 0,
		activeTeachers: counts.teachersCount ?? 0,
		availableSlots: counts.slotsCount ?? 0,
		activeLessonTypes: counts.lessonTypesCount ?? 0,
	};
}

function mapStudentWithAgreementsToDashboardStudent(student: StudentWithAgreements): DashboardStudent {
	return {
		user_id: student.user_id,
		display_name: getDisplayName(student),
		email: student.email ?? '',
		avatar_url: student.avatar_url ?? null,
		status: student.active_agreements_count > 0 ? 'active' : 'inactive',
		created_at: String(student.created_at ?? ''),
	};
}

export function parseRecentDashboardStudents(data: PaginatedStudentsResponseRaw | null): DashboardStudent[] {
	if (!data?.data) return [];
	return data.data.map(flattenStudentWithAgreements).map(mapStudentWithAgreementsToDashboardStudent);
}

export interface TeacherProfileRow {
	user_id: string;
	display_name: string;
	avatar_url: string | null;
}

export interface TeacherLessonTypeRow {
	teacher_user_id: string;
	lesson_types: { name: string } | null;
}

export interface TeacherAvailabilityRow {
	teacher_user_id: string;
}

export function countAvailabilityByTeacher(rows: TeacherAvailabilityRow[]): Map<string, number> {
	const map = new Map<string, number>();
	for (const row of rows) {
		map.set(row.teacher_user_id, (map.get(row.teacher_user_id) ?? 0) + 1);
	}
	return map;
}

export function groupLessonTypeNamesByTeacher(rows: TeacherLessonTypeRow[]): Map<string, string[]> {
	const map = new Map<string, string[]>();
	for (const row of rows) {
		const name = row.lesson_types?.name;
		if (!name) continue;
		const arr = map.get(row.teacher_user_id) ?? [];
		arr.push(name);
		map.set(row.teacher_user_id, arr);
	}
	return map;
}

function buildDashboardTeacherRow(
	uid: string,
	profileMap: Map<string, TeacherProfileRow>,
	lessonTypeMap: Map<string, string[]>,
	availCountMap: Map<string, number>,
): DashboardTeacher {
	const profile = profileMap.get(uid);
	return {
		user_id: uid,
		display_name: profile?.display_name ?? '',
		avatar_url: profile?.avatar_url ?? null,
		lessonTypeNames: lessonTypeMap.get(uid) ?? [],
		availableSlotCount: availCountMap.get(uid) ?? 0,
	};
}

export function buildDashboardTeachers(
	teacherUserIds: string[],
	profiles: TeacherProfileRow[],
	lessonTypeMap: Map<string, string[]>,
	availCountMap: Map<string, number>,
): DashboardTeacher[] {
	const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
	const teachers: DashboardTeacher[] = [];
	for (const uid of teacherUserIds) {
		teachers.push(buildDashboardTeacherRow(uid, profileMap, lessonTypeMap, availCountMap));
	}
	return teachers;
}
