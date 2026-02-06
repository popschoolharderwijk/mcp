import { describe, expect, it } from 'bun:test';
import { fixtures } from '../fixtures';

const { allProfiles, allUserRoles } = fixtures;

describe('RLS: verify ground truth', () => {
	it('should have exactly 12 profiles', () => {
		expect(allProfiles).toHaveLength(12);
	});

	it('should have exactly 4 user roles (only explicit roles)', () => {
		// Only site_admin, admin (2), staff have explicit roles
		// Teachers are identified by the teachers table, not by a role
		// Users A-D have no role entry
		expect(allUserRoles).toHaveLength(4);
	});

	it('should have 1 site_admin', () => {
		const siteAdmins = allUserRoles.filter((ur) => ur.role === 'site_admin');
		expect(siteAdmins).toHaveLength(1);
	});

	it('should have 2 admins', () => {
		const admins = allUserRoles.filter((ur) => ur.role === 'admin');
		expect(admins).toHaveLength(2);
	});

	it('should have 1 staff', () => {
		const staff = allUserRoles.filter((ur) => ur.role === 'staff');
		expect(staff).toHaveLength(1);
	});

	it('should have 0 teachers in user_roles (teachers are in teachers table)', () => {
		const teachers = allUserRoles.filter((ur) => ur.role === 'teacher');
		expect(teachers).toHaveLength(0);
	});

	it('should have profiles for all user roles', () => {
		// Every user_role should have a corresponding profile
		for (const userRole of allUserRoles) {
			const profile = allProfiles.find((p) => p.user_id === userRole.user_id);
			expect(profile).toBeDefined();
			expect(profile?.user_id).toBe(userRole.user_id);
		}
	});

	it('should have 8 users without explicit roles', () => {
		// Teachers (alice, bob), students (A-D), and regular users (A-B) exist in profiles but have no entry in user_roles
		// Teachers are identified by the teachers table, not by a role
		const userIdsWithRoles = new Set(allUserRoles.map((ur) => ur.user_id));
		const profilesWithoutRoles = allProfiles.filter((p) => !userIdsWithRoles.has(p.user_id));
		expect(profilesWithoutRoles).toHaveLength(8);

		const emails = profilesWithoutRoles.map((p) => p.email).sort();
		expect(emails).toEqual([
			'student-a@test.nl',
			'student-b@test.nl',
			'student-c@test.nl',
			'student-d@test.nl',
			'teacher-alice@test.nl',
			'teacher-bob@test.nl',
			'user-a@test.nl',
			'user-b@test.nl',
		]);
	});

	it('should have correct email for site_admin', () => {
		const siteAdminRole = allUserRoles.find((ur) => ur.role === 'site_admin');
		expect(siteAdminRole).toBeDefined();
		if (!siteAdminRole) return;
		const siteAdminProfile = allProfiles.find((p) => p.user_id === siteAdminRole.user_id);
		expect(siteAdminProfile?.email).toBe('site-admin@test.nl');
	});
});
