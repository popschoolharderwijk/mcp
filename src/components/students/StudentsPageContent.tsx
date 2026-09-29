import { StudentDeleteDialog } from '@/components/students/StudentDeleteDialog';
import { StudentFormDialog } from '@/components/students/StudentFormDialog';
import { DataTable } from '@/components/ui/data-table';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
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
	const rowActions = buildStudentsRowActions(isPrivileged, isAdmin, isSiteAdmin, controller.runAction);

	return (
		<div>
			<PageShell title={NAV_LABELS.students} description="Beheer alle leerlingen en hun gegevens">
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
			</PageShell>

			<StudentFormDialog
				open={controller.studentFormDialog.open}
				onOpenChange={(open) => controller.setStudentFormDialog({ ...controller.studentFormDialog, open })}
				onSuccess={controller.loadStudents}
				student={controller.studentFormDialog.student ?? undefined}
			/>

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
