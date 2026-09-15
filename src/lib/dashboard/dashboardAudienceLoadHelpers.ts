import type { DashboardAudience } from '@/lib/dashboard/dashboardAudienceHelpers';
import type {
	DashboardDataLoadResult,
	DashboardStats,
	DashboardStudent,
	DashboardTeacher,
} from '@/lib/dashboard/dashboardDataHelpers';
import type { StudentDashboardData } from '@/lib/dashboard/studentDashboardHelpers';
import type { TeacherDashboardData } from '@/lib/dashboard/teacherDashboardHelpers';

export interface DashboardViewData {
	stats: DashboardStats | null;
	recentStudents: DashboardStudent[];
	teachers: DashboardTeacher[];
	teacherDashboard: TeacherDashboardData | null;
	studentDashboard: StudentDashboardData | null;
}

export const emptyDashboardViewData: DashboardViewData = {
	stats: null,
	recentStudents: [],
	teachers: [],
	teacherDashboard: null,
	studentDashboard: null,
};

export type DashboardAudienceLoadResult =
	| { kind: 'privileged'; data: DashboardDataLoadResult }
	| { kind: 'privileged-empty' }
	| { kind: 'teacher'; teacherDashboard: TeacherDashboardData }
	| { kind: 'student'; studentDashboard: StudentDashboardData }
	| { kind: 'skip' };

export interface DashboardAudienceLoaders {
	privileged: (isPrivileged: boolean) => Promise<DashboardDataLoadResult | null>;
	teacher: (teacherUserId: string) => Promise<TeacherDashboardData>;
	student: (studentUserId: string) => Promise<StudentDashboardData>;
}

export async function loadDashboardAudienceData(
	params: {
		audience: DashboardAudience;
		teacherUserId: string | null | undefined;
		userId: string | undefined;
	},
	loaders: DashboardAudienceLoaders,
): Promise<DashboardAudienceLoadResult> {
	if (params.audience === 'privileged') {
		const data = await loaders.privileged(true);
		if (!data) return { kind: 'privileged-empty' };
		return { kind: 'privileged', data };
	}

	if (params.audience === 'teacher') {
		if (!params.teacherUserId) return { kind: 'skip' };
		const teacherDashboard = await loaders.teacher(params.teacherUserId);
		return { kind: 'teacher', teacherDashboard };
	}

	if (!params.userId) return { kind: 'skip' };
	return { kind: 'student', studentDashboard: await loaders.student(params.userId) };
}

export function dashboardStateAfterLoad(
	current: DashboardViewData,
	result: DashboardAudienceLoadResult,
): DashboardViewData {
	if (result.kind === 'privileged') {
		return {
			stats: result.data.stats,
			recentStudents: result.data.recentStudents,
			teachers: result.data.teachers,
			teacherDashboard: null,
			studentDashboard: null,
		};
	}

	if (result.kind === 'privileged-empty') {
		return {
			...current,
			teacherDashboard: null,
			studentDashboard: null,
		};
	}

	if (result.kind === 'teacher') {
		return {
			stats: null,
			recentStudents: result.teacherDashboard.recentStudents,
			teachers: [],
			teacherDashboard: result.teacherDashboard,
			studentDashboard: null,
		};
	}

	if (result.kind === 'student') {
		return {
			stats: null,
			recentStudents: [],
			teachers: [],
			teacherDashboard: null,
			studentDashboard: result.studentDashboard,
		};
	}

	return emptyDashboardViewData;
}
