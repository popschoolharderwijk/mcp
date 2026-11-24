/** Same union as `public.app_role` / frontend `Enums<'app_role'>`. */
export type AppRole = 'site_admin' | 'admin' | 'staff';

export function isAppRole(role: string | null | undefined): role is AppRole {
	return role === 'site_admin' || role === 'admin' || role === 'staff';
}

export function isAdminRole(role: AppRole | null | undefined): boolean {
	return role === 'admin' || role === 'site_admin';
}
