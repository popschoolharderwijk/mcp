import { StudentDeleteDialog } from '@/components/students/StudentDeleteDialog';
import { DataTable } from '@/components/ui/data-table';
import { NavPageShell } from '@/components/ui/nav-page-shell';
import type { useListPageTableState } from '@/hooks/useListPageTableState';
import type { useStudentsPageController } from '@/hooks/useStudentsPageController';
import { buildStudentsRowActions } from '@/lib/students/studentsPageViewHelpers';

interface StudentsPageContentProps {
	isPrivileged: boolean;
	isAdmin: boolean;
	isSiteAdmin: boolean;
	tableState: ReturnType<typeof useListPageTableState>;
	controller: ReturnType<typeof useStudentsPageController>;
}

export function StudentsPageContent({
	isPrivileged,
	isAdmin,
	isSiteAdmin,
	tableState,
	controller,
}: StudentsPageContentProps) {
	const rowActions = buildStudentsRowActions(
		isPrivileged,
		isAdmin,
		isSiteAdmin,
		controller.handleEdit,
		controller.runAction,
	);

	return (
		<div>
			<NavPageShell item="students">
				<DataTable
					data={controller.students}
					columns={controller.columns}
					searchQuery={tableState.searchQuery}
					onSearchChange={tableState.handleSearchChange}
					loading={tableState.loading}
					getRowKey={(student) => student.user_id}
					emptyMessage="Geen leerlingen gevonden"
					quickFilter={tableState.quickFilterGroups}
					serverPagination={{
						totalCount: tableState.totalCount,
						currentPage: tableState.currentPage,
						rowsPerPage: tableState.rowsPerPage,
						onPageChange: tableState.handlePageChange,
						onRowsPerPageChange: tableState.handleRowsPerPageChange,
					}}
					initialSortColumn={tableState.sortColumn || undefined}
					initialSortDirection={tableState.sortDirection || undefined}
					onSortChange={tableState.handleSortChange}
					rowActions={rowActions}
				/>
			</NavPageShell>

			<StudentDeleteDialog
				deleteDialog={controller.deleteDialog}
				onOpenChange={(open) => {
					if (!open) controller.setDeleteDialog(null);
				}}
				onConfirm={() => controller.runAction({ kind: 'confirm-delete' })}
				onDeleteUserChange={(deleteUser) => {
					if (!controller.deleteDialog) return;
					controller.setDeleteDialog({ ...controller.deleteDialog, deleteUser });
				}}
			/>
		</div>
	);
}
