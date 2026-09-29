import { LuPlus } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { PageShell } from '@/components/ui/page-shell';
import type { buildUsersRowActions } from '@/components/users/UsersPageParts';
import { NAV_LABELS } from '@/config/nav-labels';
import type { buildUsersColumns, buildUsersQuickFilterGroups, UserWithRole } from '@/lib/users/usersPageHelpers';
import {
	resolveUsersTableInitialSortColumn,
	resolveUsersTableInitialSortDirection,
	resolveUsersTableRowClassName,
	shouldShowUsersCreateButton,
} from '@/lib/users/usersPageTableHelpers';

interface UsersPageTableProps {
	isSiteAdmin: boolean;
	isAdmin: boolean;
	userId: string | undefined;
	users: UserWithRole[];
	columns: ReturnType<typeof buildUsersColumns>;
	searchQuery: string;
	onSearchChange: (value: string) => void;
	loading: boolean;
	totalCount: number;
	currentPage: number;
	rowsPerPage: number;
	onPageChange: (page: number) => void;
	onRowsPerPageChange: (rows: number) => void;
	sortColumn: string | null;
	sortDirection: 'asc' | 'desc' | null;
	onSortChange: (column: string, direction: 'asc' | 'desc') => void;
	quickFilterGroups: ReturnType<typeof buildUsersQuickFilterGroups>;
	rowActions: ReturnType<typeof buildUsersRowActions>;
	onCreate: () => void;
}

export function UsersPageTable(props: UsersPageTableProps) {
	return (
		<PageShell
			title={NAV_LABELS.users}
			description="Beheer alle gebruikers en hun rollen"
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
		</PageShell>
	);
}
