/**
 * RLS Role Analyzer
 *
 * Parses RLS policy expressions to extract which roles have access to which operations.
 * This enables dynamic generation of a roles comparison matrix.
 */

import { ALL_ROLES, type AppRole } from './roles';

export interface RLSPolicy {
	table_name: string;
	policy_name: string;
	command: string;
	roles: string;
	using_expression: string;
	with_check_expression: string;
}

export type PermissionLevel = 'full' | 'own' | 'limited' | 'none';

export interface RolePermission {
	role: AppRole;
	level: PermissionLevel;
	description?: string;
}

export interface PermissionEntry {
	id: string;
	table: string;
	operation: string;
	description: string;
	permissions: Map<AppRole, PermissionLevel>;
	policies: string[];
}

/**
 * Grouped permission descriptions for the matrix (user-friendly)
 */
export const GROUPED_PERMISSIONS: Array<{
	id: string;
	description: string;
	checkPolicies: (policies: RLSPolicy[]) => Map<AppRole, PermissionLevel>;
}> = [
	{
		id: 'view_all_profiles',
		description: 'Alle profielen bekijken',
		checkPolicies: (policies) => {
			const result = new Map<AppRole, PermissionLevel>();
			for (const role of ALL_ROLES) {
				result.set(role, 'none');
			}

			for (const policy of policies) {
				if (policy.table_name !== 'profiles' || policy.command !== 'SELECT') continue;

				const expr = policy.using_expression.toLowerCase();

				if (expr.includes('is_site_admin') || expr.includes('is_admin')) {
					result.set('site_admin', 'full');
					result.set('admin', 'full');
				}
				if (expr.includes('is_staff')) {
					result.set('staff', 'full');
				}
			}

			return result;
		},
	},
	{
		id: 'view_own_profile',
		description: 'Eigen profiel bekijken',
		checkPolicies: (policies) => {
			const result = new Map<AppRole, PermissionLevel>();
			for (const role of ALL_ROLES) {
				result.set(role, 'none');
			}

			for (const policy of policies) {
				if (policy.table_name !== 'profiles' || policy.command !== 'SELECT') continue;

				const expr = policy.using_expression.toLowerCase();

				// auth.uid() = user_id means own profile access
				if (expr.includes('auth.uid()') && expr.includes('user_id')) {
					for (const role of ALL_ROLES) {
						result.set(role, 'own');
					}
				}
			}

			return result;
		},
	},
	{
		id: 'view_student_profiles',
		description: 'Leerlingen van docent bekijken',
		checkPolicies: (policies) => {
			const result = new Map<AppRole, PermissionLevel>();
			for (const role of ALL_ROLES) {
				result.set(role, 'none');
			}

			for (const policy of policies) {
				if (policy.table_name !== 'profiles' || policy.command !== 'SELECT') continue;

				const expr = policy.using_expression.toLowerCase();

				if (expr.includes('is_teacher') && expr.includes('teacher_students')) {
					result.set('teacher', 'limited');
				}
			}

			return result;
		},
	},
	{
		id: 'edit_all_profiles',
		description: 'Alle profielen bewerken',
		checkPolicies: (policies) => {
			const result = new Map<AppRole, PermissionLevel>();
			for (const role of ALL_ROLES) {
				result.set(role, 'none');
			}

			for (const policy of policies) {
				if (policy.table_name !== 'profiles' || policy.command !== 'UPDATE') continue;

				const expr = policy.using_expression.toLowerCase();

				if (expr.includes('is_site_admin') || expr.includes('is_admin')) {
					result.set('site_admin', 'full');
					result.set('admin', 'full');
				}
			}

			return result;
		},
	},
	{
		id: 'edit_student_profiles',
		description: 'Leerling profielen bewerken',
		checkPolicies: (policies) => {
			const result = new Map<AppRole, PermissionLevel>();
			for (const role of ALL_ROLES) {
				result.set(role, 'none');
			}

			for (const policy of policies) {
				if (policy.table_name !== 'profiles' || policy.command !== 'UPDATE') continue;

				const expr = policy.using_expression.toLowerCase();

				if (expr.includes('is_staff') && expr.includes('is_student')) {
					result.set('staff', 'limited');
				}
			}

			return result;
		},
	},
	{
		id: 'edit_own_profile',
		description: 'Eigen profiel bewerken',
		checkPolicies: (policies) => {
			const result = new Map<AppRole, PermissionLevel>();
			for (const role of ALL_ROLES) {
				result.set(role, 'none');
			}

			for (const policy of policies) {
				if (policy.table_name !== 'profiles' || policy.command !== 'UPDATE') continue;

				const expr = policy.using_expression.toLowerCase();

				if (expr.includes('auth.uid()') && expr.includes('user_id') && !expr.includes('is_')) {
					for (const role of ALL_ROLES) {
						result.set(role, 'own');
					}
				}
			}

			return result;
		},
	},
	{
		id: 'view_all_roles',
		description: 'Alle rollen bekijken',
		checkPolicies: (policies) => {
			const result = new Map<AppRole, PermissionLevel>();
			for (const role of ALL_ROLES) {
				result.set(role, 'none');
			}

			for (const policy of policies) {
				if (policy.table_name !== 'user_roles' || policy.command !== 'SELECT') continue;

				const expr = policy.using_expression.toLowerCase();

				if (expr.includes('is_site_admin') || expr.includes('is_admin')) {
					result.set('site_admin', 'full');
					result.set('admin', 'full');
				}
				if (expr.includes('is_staff')) {
					result.set('staff', 'full');
				}
			}

			return result;
		},
	},
	{
		id: 'view_own_role',
		description: 'Eigen rol bekijken',
		checkPolicies: (policies) => {
			const result = new Map<AppRole, PermissionLevel>();
			for (const role of ALL_ROLES) {
				result.set(role, 'none');
			}

			for (const policy of policies) {
				if (policy.table_name !== 'user_roles' || policy.command !== 'SELECT') continue;

				const expr = policy.using_expression.toLowerCase();

				if (expr.includes('auth.uid()') && expr.includes('user_id')) {
					for (const role of ALL_ROLES) {
						result.set(role, 'own');
					}
				}
			}

			return result;
		},
	},
	{
		id: 'change_roles',
		description: 'Rollen wijzigen',
		checkPolicies: (policies) => {
			const result = new Map<AppRole, PermissionLevel>();
			for (const role of ALL_ROLES) {
				result.set(role, 'none');
			}

			for (const policy of policies) {
				if (policy.table_name !== 'user_roles' || policy.command !== 'UPDATE') continue;

				const expr = policy.using_expression.toLowerCase();

				if (expr.includes('is_site_admin')) {
					result.set('site_admin', 'limited'); // Limited because can't change own role
				}
			}

			return result;
		},
	},
	{
		id: 'view_own_students',
		description: 'Eigen leerlingen bekijken',
		checkPolicies: (policies) => {
			const result = new Map<AppRole, PermissionLevel>();
			for (const role of ALL_ROLES) {
				result.set(role, 'none');
			}

			for (const policy of policies) {
				if (policy.table_name !== 'teacher_students' || policy.command !== 'SELECT') continue;

				const expr = policy.using_expression.toLowerCase();

				if (expr.includes('teacher_id') && expr.includes('auth.uid()')) {
					result.set('teacher', 'own');
				}
			}

			return result;
		},
	},
	{
		id: 'view_all_student_links',
		description: 'Alle docent-leerling koppelingen bekijken',
		checkPolicies: (policies) => {
			const result = new Map<AppRole, PermissionLevel>();
			for (const role of ALL_ROLES) {
				result.set(role, 'none');
			}

			for (const policy of policies) {
				if (policy.table_name !== 'teacher_students' || policy.command !== 'SELECT') continue;

				const expr = policy.using_expression.toLowerCase();

				if (expr.includes('is_site_admin') || expr.includes('is_admin')) {
					result.set('site_admin', 'full');
					result.set('admin', 'full');
				}
				if (expr.includes('is_staff')) {
					result.set('staff', 'full');
				}
			}

			return result;
		},
	},
	{
		id: 'link_students',
		description: 'Leerlingen aan zichzelf koppelen',
		checkPolicies: (policies) => {
			const result = new Map<AppRole, PermissionLevel>();
			for (const role of ALL_ROLES) {
				result.set(role, 'none');
			}

			for (const policy of policies) {
				if (policy.table_name !== 'teacher_students' || policy.command !== 'INSERT') continue;

				const expr = (policy.using_expression + ' ' + policy.with_check_expression).toLowerCase();

				if (expr.includes('is_teacher') && expr.includes('teacher_id')) {
					result.set('teacher', 'own');
				}
			}

			return result;
		},
	},
	{
		id: 'unlink_students',
		description: 'Leerlingen van zichzelf ontkoppelen',
		checkPolicies: (policies) => {
			const result = new Map<AppRole, PermissionLevel>();
			for (const role of ALL_ROLES) {
				result.set(role, 'none');
			}

			for (const policy of policies) {
				if (policy.table_name !== 'teacher_students' || policy.command !== 'DELETE') continue;

				const expr = policy.using_expression.toLowerCase();

				if (expr.includes('teacher_id') && expr.includes('auth.uid()')) {
					result.set('teacher', 'own');
				}
			}

			return result;
		},
	},
];

/**
 * Analyze policies and generate the role permission matrix
 */
export function analyzeRolePermissions(
	policies: RLSPolicy[],
): Array<{ id: string; description: string; permissions: Map<AppRole, PermissionLevel> }> {
	return GROUPED_PERMISSIONS.map((permission) => ({
		id: permission.id,
		description: permission.description,
		permissions: permission.checkPolicies(policies),
	}));
}

/**
 * Get display info for a permission level
 */
export function getPermissionDisplay(level: PermissionLevel): {
	icon: 'check' | 'x' | 'limited';
	color: string;
	label: string;
} {
	switch (level) {
		case 'full':
			return { icon: 'check', color: 'text-green-600 dark:text-green-400', label: 'Ja' };
		case 'own':
			return { icon: 'check', color: 'text-green-600 dark:text-green-400', label: 'Eigen' };
		case 'limited':
			return { icon: 'limited', color: 'text-amber-600 dark:text-amber-400', label: 'Beperkt' };
		case 'none':
			return { icon: 'x', color: 'text-red-600 dark:text-red-400', label: 'Nee' };
	}
}

// Role display names and icons are now in @/lib/role-icons.ts
// Use getRoleDisplayName and getRoleIcon from there
