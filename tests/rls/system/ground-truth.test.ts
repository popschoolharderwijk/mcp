import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { SHARED_LOGIN_FAMILY, STUDENTS, TEACHERS, USER_ROLES, USERS } from '../seed-data-constants';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

const { allProfiles, allUserRoles } = fixtures;

describe('RLS: verify ground truth', () => {
	it('should have the seeded profile count', () => {
		expect(allProfiles).toHaveLength(USERS.TOTAL);
	});

	it('should have exactly 8 user roles (only explicit roles)', () => {
		expect(allUserRoles).toHaveLength(USER_ROLES.EXPLICIT_ROW_COUNT);
	});

	it('should have 1 site_admin', () => {
		const siteAdmins = allUserRoles.filter((ur) => ur.role === 'site_admin');
		expect(siteAdmins).toHaveLength(USERS.SITE_ADMIN);
	});

	it('should have 2 admins', () => {
		const admins = allUserRoles.filter((ur) => ur.role === 'admin');
		expect(admins).toHaveLength(USERS.ADMIN);
	});

	it('should have 5 staff', () => {
		const staff = allUserRoles.filter((ur) => ur.role === 'staff');
		expect(staff).toHaveLength(USERS.STAFF);
	});

	it('should have profiles for all user roles', () => {
		// Every user_role should have a corresponding profile
		for (const userRole of allUserRoles) {
			const profile = allProfiles.find((p) => p.user_id === userRole.user_id);
			expect(profile).toBeDefined();
			expect(profile?.user_id).toBe(userRole.user_id);
		}
	});

	it('should have profiles without explicit roles matching seed mix', () => {
		const userIdsWithRoles = new Set(allUserRoles.map((ur) => ur.user_id));
		const profilesWithoutRoles = allProfiles.filter((p) => !userIdsWithRoles.has(p.user_id));
		expect(profilesWithoutRoles).toHaveLength(USERS.WITHOUT_ROLE);

		const teacherEmails = profilesWithoutRoles
			.filter((p) => p.email?.startsWith('teacher-'))
			.map((p) => p.email)
			.sort();
		expect(teacherEmails).toHaveLength(TEACHERS.TOTAL);

		const studentEmails = profilesWithoutRoles
			.filter((p) => p.email?.startsWith('student-'))
			.map((p) => p.email)
			.sort();
		expect(studentEmails).toHaveLength(STUDENTS.WITH_OWN_LOGIN);

		const userEmails = profilesWithoutRoles
			.filter((p) => p.email?.startsWith('user-'))
			.map((p) => p.email)
			.sort();
		expect(userEmails).toHaveLength(USERS.PLAIN_USERS);

		const sharedParent = profilesWithoutRoles.find((p) => p.email === SHARED_LOGIN_FAMILY.PARENT_EMAIL);
		expect(sharedParent?.user_id).toBe(SHARED_LOGIN_FAMILY.PARENT_USER_ID);

		const sharedMembers = profilesWithoutRoles.filter((p) => p.email == null);
		expect(sharedMembers).toHaveLength(SHARED_LOGIN_FAMILY.MEMBER_COUNT);
	});

	it('should have shared-login children in students', () => {
		const { allStudents } = fixtures;
		expect(allStudents).toHaveLength(STUDENTS.TOTAL);
		expect(allStudents.some((s) => s.user_id === SHARED_LOGIN_FAMILY.CHILD_EMMA_USER_ID)).toBe(true);
		expect(allStudents.some((s) => s.user_id === SHARED_LOGIN_FAMILY.CHILD_LARS_USER_ID)).toBe(true);
	});

	it('should have correct email for site_admin', () => {
		const siteAdminRole = allUserRoles.find((ur) => ur.role === 'site_admin');
		expect(siteAdminRole).toBeDefined();
		if (!siteAdminRole) return;
		const siteAdminProfile = allProfiles.find((p) => p.user_id === siteAdminRole.user_id);
		expect(siteAdminProfile?.email).toBe('site-admin@test.nl');
	});
});
