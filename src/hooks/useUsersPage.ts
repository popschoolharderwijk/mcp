import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useServerPaginatedListState } from '@/hooks/useServerPaginatedListState';
import { useUsersPageController } from '@/hooks/useUsersPageController';
import type { AppRole } from '@/lib/roles';
import { userDetailHref } from '@/lib/users/userDetailPageHelpers';
import type { UserWithRole } from '@/lib/users/usersPageHelpers';
import {
	buildUserFormDialogOpenChangeHandler,
	buildUsersDeleteDialogOpenChangeHandler,
	buildUsersPageRowActions,
	buildUsersPageShellState,
	createUsersPageRoleFilterSetter,
} from '@/lib/users/usersPageShellHelpers';

export function useUsersPage() {
	const navigate = useNavigate();
	const { user, isAdmin, isSiteAdmin, isLoading: authLoading } = useAuth();
	const pagination = useServerPaginatedListState({
		storageKey: 'users',
		initialSortColumn: 'created_at',
		initialSortDirection: 'desc',
		initialFilters: { selectedRole: null },
	});

	const shell = buildUsersPageShellState({
		isAdmin,
		isSiteAdmin,
		userId: user?.id,
		selectedRoleFilter: pagination.filters.selectedRole as AppRole | null | 'none' | undefined,
	});
	const setSelectedRole = createUsersPageRoleFilterSetter(pagination.setFilters);

	const controller = useUsersPageController({
		hasAccess: shell.hasAccess,
		authLoading,
		isSiteAdmin: shell.isSiteAdmin,
		currentUserId: shell.userId,
		currentPage: pagination.currentPage,
		rowsPerPage: pagination.rowsPerPage,
		debouncedSearchQuery: pagination.debouncedSearchQuery,
		selectedRole: shell.selectedRole,
		sortColumn: pagination.sortColumn,
		sortDirection: pagination.sortDirection,
		setLoading: pagination.setLoading,
		setTotalCount: pagination.setTotalCount,
		setSelectedRole,
	});

	const handleEdit = useCallback(
		(targetUser: UserWithRole) => {
			navigate(userDetailHref(targetUser.user_id));
		},
		[navigate],
	);

	const rowActions = useMemo(
		() =>
			buildUsersPageRowActions({
				isAdmin: shell.isAdmin,
				isSiteAdmin: shell.isSiteAdmin,
				currentUserId: shell.userId,
				onEdit: handleEdit,
				onDelete: controller.handleDelete,
			}),
		[shell.isAdmin, shell.isSiteAdmin, shell.userId, handleEdit, controller.handleDelete],
	);

	return {
		hasAccess: shell.hasAccess,
		isSiteAdmin: shell.isSiteAdmin,
		isAdmin: shell.isAdmin,
		userId: shell.userId,
		pagination,
		controller,
		rowActions,
		userFormDialogOpenChange: buildUserFormDialogOpenChangeHandler(
			controller.userFormDialog,
			controller.setUserFormDialog,
		),
		deleteDialogOpenChange: buildUsersDeleteDialogOpenChangeHandler(controller.setDeleteDialog),
	};
}
