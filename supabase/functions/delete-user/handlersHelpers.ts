const DELETE_OTHER_USER_ROLES = ['admin', 'site_admin'] as const;

export interface DeleteUserBody {
	userId?: string;
}

export function parseDeleteUserBody(text: string): DeleteUserBody {
	if (!text) return {};
	try {
		return JSON.parse(text) as { userId?: string };
	} catch {
		return {};
	}
}

export function isSelfDeleteRequest(requestedUserId: string | undefined, requestingUserId: string): boolean {
	return !requestedUserId || requestedUserId === requestingUserId;
}

export function canDeleteOtherUserAccount(role: string): boolean {
	return DELETE_OTHER_USER_ROLES.includes(role as (typeof DELETE_OTHER_USER_ROLES)[number]);
}

export type DeleteUserPermissionResult =
	| { kind: 'self'; targetUserId: string }
	| { kind: 'other'; targetUserId: string }
	| { kind: 'forbidden'; targetUserId: string; reason: 'unverified' | 'forbidden' };

export function resolveDeleteUserPermission(
	requestingUserId: string,
	requestedUserId: string | undefined,
	requestingUserRole: string | null,
): DeleteUserPermissionResult {
	if (isSelfDeleteRequest(requestedUserId, requestingUserId)) {
		return { kind: 'self', targetUserId: requestingUserId };
	}

	if (!requestingUserRole) {
		return { kind: 'forbidden', targetUserId: requestingUserId, reason: 'unverified' };
	}

	if (!canDeleteOtherUserAccount(requestingUserRole)) {
		return { kind: 'forbidden', targetUserId: requestingUserId, reason: 'forbidden' };
	}

	return { kind: 'other', targetUserId: requestedUserId as string };
}

export function isLastSiteAdminDeleteError(message: string): boolean {
	return message.includes('last site_admin');
}

export interface DeleteUserTargetResolution {
	targetUserId: string;
	error: { status: number; error: string } | null;
}

export function resolveDeleteUserTargetFromRole(
	requestingUserId: string,
	requestedUserId: string | undefined,
	requestingUserRole: string | null,
): DeleteUserTargetResolution {
	const permission = resolveDeleteUserPermission(requestingUserId, requestedUserId, requestingUserRole);
	return mapDeleteUserPermissionToTarget(requestingUserId, permission);
}

export function resolveDeleteUserRoleFromQuery(roleData: { role: string } | null, roleError: unknown): string | null {
	if (roleError || !roleData) return null;
	return roleData.role;
}

export function mapDeleteUserPermissionToTarget(
	requestingUserId: string,
	permission: DeleteUserPermissionResult,
): DeleteUserTargetResolution {
	if (permission.kind === 'forbidden' && permission.reason === 'unverified') {
		return {
			targetUserId: requestingUserId,
			error: { status: 403, error: 'Could not verify permissions' },
		};
	}

	if (permission.kind === 'forbidden' && permission.reason === 'forbidden') {
		return {
			targetUserId: requestingUserId,
			error: { status: 403, error: 'Je hebt geen rechten om andere accounts te verwijderen.' },
		};
	}

	return { targetUserId: permission.targetUserId, error: null };
}
