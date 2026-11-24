import { describe, expect, it } from 'bun:test';
import { computeSidebarNavVisibility } from '../../../src/hooks/sidebarNavVisibilityHelpers';

describe('computeSidebarNavVisibility', () => {
	it('shows admin and teacher nav for site admins', () => {
		expect(
			computeSidebarNavVisibility({
				isAdmin: false,
				isSiteAdmin: true,
				isPrivileged: true,
				isTeacher: false,
				hasOwnedProjects: false,
				ownedProjectsLoading: false,
			}),
		).toEqual({
			isStudent: false,
			isTeacher: false,
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
				hasOwnedProjects: false,
				ownedProjectsLoading: false,
			}),
		).toEqual({
			isStudent: false,
			isTeacher: true,
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
				hasOwnedProjects: true,
				ownedProjectsLoading: false,
			}).showProjectsNav,
		).toBe(true);
	});

	it('hides projects nav while owned projects are loading', () => {
		expect(
			computeSidebarNavVisibility({
				isAdmin: false,
				isSiteAdmin: false,
				isPrivileged: false,
				isTeacher: true,
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
				hasOwnedProjects: false,
				ownedProjectsLoading: false,
			}).isStudent,
		).toBe(true);
	});
});
