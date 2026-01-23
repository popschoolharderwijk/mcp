import { createClientBypassRLS } from './db';
import type { TestUser } from './test-users';

const dbNoRLS = createClientBypassRLS();

// Fetch ground truth data once
const { data: allProfiles, error: profilesError } = await dbNoRLS.from('profiles').select('*');
const { data: allUserRoles, error: rolesError } = await dbNoRLS.from('user_roles').select('*');

if (profilesError || !allProfiles) {
	throw new Error(`Failed to fetch profiles: ${profilesError?.message}`);
}

if (rolesError || !allUserRoles) {
	throw new Error(`Failed to fetch user roles: ${rolesError?.message}`);
}

export const fixtures = {
	allProfiles,
	allUserRoles,
	userRoleMap: new Map(allUserRoles.map((ur) => [ur.user_id, ur.role])),

	// Helper to find profile by user
	getProfile: (user: TestUser) => allProfiles.find((p) => p.email === user),

	// Helper to find user_id by user
	getUserId: (user: TestUser) => allProfiles.find((p) => p.email === user)?.user_id,

	// Helper to find role by user
	getRole: (user: TestUser) => {
		const profile = allProfiles.find((p) => p.email === user);
		if (!profile) return undefined;
		return allUserRoles.find((ur) => ur.user_id === profile.user_id);
	},
};
