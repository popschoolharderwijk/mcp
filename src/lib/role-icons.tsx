/**
 * Role Icons Utility
 *
 * Centralized icons for each application role.
 * Use these icons consistently throughout the application.
 */

import { LuBriefcase, LuGraduationCap, LuShield, LuStar, LuUser } from 'react-icons/lu';
import type { AppRole } from './roles';

// Re-export for convenience
export { ALL_ROLES, type AppRole } from './roles';

/**
 * Get the icon component for a role
 */
export function getRoleIcon(role: AppRole, className?: string) {
	const iconClass = className || 'h-4 w-4';

	switch (role) {
		case 'site_admin':
			return <LuStar className={iconClass} />;
		case 'admin':
			return <LuShield className={iconClass} />;
		case 'staff':
			return <LuBriefcase className={iconClass} />;
		case 'teacher':
			return <LuGraduationCap className={iconClass} />;
		case 'student':
			return <LuUser className={iconClass} />;
	}
}

/**
 * Get the display name for a role (in Dutch)
 */
export function getRoleDisplayName(role: AppRole): string {
	const names: Record<AppRole, string> = {
		site_admin: 'Site Admin',
		admin: 'Admin',
		staff: 'Staff',
		teacher: 'Docent',
		student: 'Leerling',
	};
	return names[role];
}

/**
 * Role badge component - displays icon and name together
 */
export function RoleBadge({
	role,
	showLabel = true,
	iconClassName,
	className,
}: {
	role: AppRole;
	showLabel?: boolean;
	iconClassName?: string;
	className?: string;
}) {
	return (
		<div className={`flex items-center gap-1 ${className || ''}`}>
			{getRoleIcon(role, iconClassName)}
			{showLabel && <span>{getRoleDisplayName(role)}</span>}
		</div>
	);
}

/**
 * Role header component - icon above label, centered
 */
export function RoleHeader({
	role,
	iconClassName,
	labelClassName,
}: {
	role: AppRole;
	iconClassName?: string;
	labelClassName?: string;
}) {
	return (
		<div className="flex flex-col items-center">
			{getRoleIcon(role, iconClassName || 'h-4 w-4 mb-1')}
			<span className={labelClassName || 'text-xs'}>{getRoleDisplayName(role)}</span>
		</div>
	);
}
