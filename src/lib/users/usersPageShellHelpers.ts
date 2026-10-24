import { buildUsersRowActions } from '@/components/users/UsersPageParts';
import type { useUsersPageController } from '@/hooks/useUsersPageController';
import type { AppRole } from '@/lib/roles';
import type { UserWithRole } from '@/lib/users/usersPageHelpers';

export function shouldShowUsersPage(isAdmin: boolean, isSiteAdmin: boolean): boolean {
	return isAdmin || isSiteAdmin;
}

export function buildUsersPageShellState(input: {
	isAdmin: boolean;
	isSiteAdmin: boolean;
	userId: string | undefined;
	selectedRoleFilter: AppRole | null | 'none' | undefined;
}) {
	return {
		hasAccess: shouldShowUsersPage(input.isAdmin, input.isSiteAdmin),
		selectedRole: input.selectedRoleFilter ?? null,
		userId: input.userId,
		isAdmin: input.isAdmin,
		isSiteAdmin: input.isSiteAdmin,
	};
}

export function buildUsersPageRowActions(params: {
	isAdmin: boolean;
	isSiteAdmin: boolean;
	currentUserId: string | undefined;
	onEdit: ReturnType<typeof useUsersPageController>['handleEdit'];
	onDelete: ReturnType<typeof useUsersPageController>['handleDelete'];
}) {
	return buildUsersRowActions({
		canManage: params.isAdmin || params.isSiteAdmin,
		currentUserId: params.currentUserId,
		onEdit: params.onEdit,
		onDelete: params.onDelete,
	});
}

export function createUsersPageRoleFilterSetter(
	setFilters: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void,
) {
	return (value: AppRole | null | 'none') => {
		setFilters((prev) => ({ ...prev, selectedRole: value }));
	};
}

export interface UsersDeleteDialogState {
	open: boolean;
	user: UserWithRole;
}

export function buildUserFormDialogOpenChangeHandler(
	current: { open: boolean; user: UserWithRole | null },
	setUserFormDialog: (value: { open: boolean; user: UserWithRole | null }) => void,
): (open: boolean) => void {
	return (open) => setUserFormDialog({ ...current, open });
}

export function buildUsersDeleteDialogOpenChangeHandler(
	setDeleteDialog: (value: UsersDeleteDialogState | null) => void,
): (open: boolean) => void {
	return (open) => {
		if (!open) setDeleteDialog(null);
	};
}
