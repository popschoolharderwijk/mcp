export type DashboardAudience = 'privileged' | 'teacher' | 'student';

export function resolveDashboardAudience(isPrivileged: boolean, isTeacher: boolean): DashboardAudience {
	if (isPrivileged) return 'privileged';
	if (isTeacher) return 'teacher';
	return 'student';
}
