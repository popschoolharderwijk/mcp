import { describe, expect, it } from 'bun:test';
import { computeSidebarNavVisibility } from '../../../src/hooks/sidebarNavVisibilityHelpers';

describe('computeSidebarNavVisibility', () => {
	const teacherUserId = '40000000-0001-0000-0000-000000000000';

	it('shows admin and teacher nav for site admins', () => {
		expect(
			computeSidebarNavVisibility({
				isAdmin: false,
				isSiteAdmin: true,
				isPrivileged: true,
				isTeacher: false,
				teacherUserId: null,
				hasOwnedProjects: false,
				ownedProjectsLoading: false,
			}),
		).toEqual({
			isStudent: false,
			isTeacher: false,
			teacherUserId: null,
			showAdminNav: true,
			showTeachersNav: true,
			showStudentsNav: true,
			showReportsNav: true,
			showProjectsNav: true,
		});
	});

	it('marks plain teachers as non-students with reports nav', () => {
		expect(
			computeSidebarNavVisibility({
				isAdmin: false,
				isSiteAdmin: false,
				isPrivileged: false,
				isTeacher: true,
				teacherUserId,
				hasOwnedProjects: false,
				ownedProjectsLoading: false,
			}),
		).toEqual({
			isStudent: false,
			isTeacher: true,
			teacherUserId,
			showAdminNav: false,
			showTeachersNav: false,
			showStudentsNav: false,
			showReportsNav: true,
			showProjectsNav: false,
		});
	});

	it('shows projects nav for teachers with owned projects after loading', () => {
		expect(
			computeSidebarNavVisibility({
				isAdmin: false,
				isSiteAdmin: false,
				isPrivileged: false,
				isTeacher: true,
				teacherUserId,
				hasOwnedProjects: true,
				ownedProjectsLoading: false,
			}),
		).toMatchObject({
			showProjectsNav: true,
		});
	});

	it('hides projects nav while owned projects are loading', () => {
		expect(
			computeSidebarNavVisibility({
				isAdmin: false,
				isSiteAdmin: false,
				isPrivileged: false,
				isTeacher: true,
				teacherUserId,
				hasOwnedProjects: true,
				ownedProjectsLoading: true,
			}).showProjectsNav,
		).toBe(false);
	});

	it('treats non-privileged non-teachers as students', () => {
		expect(
			computeSidebarNavVisibility({
				isAdmin: false,
				isSiteAdmin: false,
				isPrivileged: false,
				isTeacher: false,
				teacherUserId: null,
				hasOwnedProjects: false,
				ownedProjectsLoading: false,
			}).isStudent,
		).toBe(true);
	});
});
