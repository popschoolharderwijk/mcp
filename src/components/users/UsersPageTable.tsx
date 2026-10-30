import { LuPlus } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { DataTable, type ServerSideDataTableControlProps } from '@/components/ui/data-table';
import { NavPageShell } from '@/components/ui/nav-page-shell';
import type { buildUsersRowActions } from '@/components/users/UsersPageParts';
import type { buildUsersColumns, buildUsersQuickFilterGroups, UserWithRole } from '@/lib/users/usersPageHelpers';
import {
	resolveUsersTableInitialSortColumn,
	resolveUsersTableInitialSortDirection,
	resolveUsersTableRowClassName,
	shouldShowUsersCreateButton,
} from '@/lib/users/usersPageTableHelpers';

interface UsersPageTableProps extends ServerSideDataTableControlProps {
	isSiteAdmin: boolean;
	isAdmin: boolean;
	userId: string | undefined;
	users: UserWithRole[];
	columns: ReturnType<typeof buildUsersColumns>;
	quickFilterGroups: ReturnType<typeof buildUsersQuickFilterGroups>;
	rowActions: ReturnType<typeof buildUsersRowActions>;
	onCreate: () => void;
}

export function UsersPageTable(props: UsersPageTableProps) {
	return (
		<NavPageShell
			item="users"
			actions={
				shouldShowUsersCreateButton(props.isAdmin, props.isSiteAdmin) ? (
					<Button onClick={props.onCreate}>
						<LuPlus className="mr-2 h-4 w-4" />
						Gebruiker toevoegen
					</Button>
				) : undefined
			}
		>
			<DataTable
				data={props.users}
				columns={props.columns}
				searchQuery={props.searchQuery}
				onSearchChange={props.onSearchChange}
				loading={props.loading}
				getRowKey={(user) => user.user_id}
				getRowClassName={(user) => resolveUsersTableRowClassName(user.user_id, props.userId)}
				emptyMessage="Geen gebruikers gevonden"
				quickFilter={props.quickFilterGroups}
				serverPagination={{
					totalCount: props.totalCount,
					currentPage: props.currentPage,
					rowsPerPage: props.rowsPerPage,
					onPageChange: props.onPageChange,
					onRowsPerPageChange: props.onRowsPerPageChange,
				}}
				initialSortColumn={resolveUsersTableInitialSortColumn(props.sortColumn)}
				initialSortDirection={resolveUsersTableInitialSortDirection(props.sortDirection)}
				onSortChange={props.onSortChange}
				rowActions={props.rowActions}
			/>
		</NavPageShell>
	);
}
