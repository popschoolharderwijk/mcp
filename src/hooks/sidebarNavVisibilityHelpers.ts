export interface SidebarNavVisibilityInput {
	isAdmin: boolean;
	isSiteAdmin: boolean;
	isPrivileged: boolean;
	isTeacher: boolean;
	teacherUserId: string | null;
	hasOwnedProjects: boolean;
	ownedProjectsLoading: boolean;
}

export interface SidebarNavVisibilityState {
	isStudent: boolean;
	isTeacher: boolean;
	teacherUserId: string | null;
	showAdminNav: boolean;
	showTeachersNav: boolean;
	showStudentsNav: boolean;
	showReportsNav: boolean;
	showProjectsNav: boolean;
}

export function computeSidebarNavVisibility(input: SidebarNavVisibilityInput): SidebarNavVisibilityState {
	const { isAdmin, isSiteAdmin, isPrivileged, isTeacher, teacherUserId, hasOwnedProjects, ownedProjectsLoading } =
		input;
	const isStudent = !isPrivileged && !isTeacher;
	const showAdminNav = isAdmin || isSiteAdmin;
	const showTeachersNav = isAdmin || isSiteAdmin;
	const showStudentsNav = isPrivileged;
	const showReportsNav = isPrivileged || isTeacher;
	const showProjectsNav =
		isAdmin || isSiteAdmin || ((isTeacher || isPrivileged) && !ownedProjectsLoading && hasOwnedProjects);

	return {
		isStudent,
		isTeacher,
		teacherUserId,
		showAdminNav,
		showTeachersNav,
		showStudentsNav,
		showReportsNav,
		showProjectsNav,
	};
}
