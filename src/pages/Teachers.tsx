import { Navigate, useNavigate } from 'react-router-dom';
import { TeachersPageCreateButton, TeachersPageDialogs } from '@/components/teachers/TeachersPageDialogs';
import { DataTable } from '@/components/ui/data-table';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
import { useActiveLessonTypes } from '@/hooks/useActiveLessonTypes';
import { useAuth } from '@/hooks/useAuth';
import { useListPageTableState } from '@/hooks/useListPageTableState';
import { useTeachersPageController } from '@/hooks/useTeachersPageController';
import { shouldShowTeachersPage } from '@/lib/teachers/teachersPageShellHelpers';

export default function Teachers() {
	const { isAdmin, isSiteAdmin, isLoading: authLoading } = useAuth();
	const navigate = useNavigate();
	const hasAccess = shouldShowTeachersPage(isAdmin, isSiteAdmin);
	const { lessonTypes } = useActiveLessonTypes(hasAccess);
	const {
		loading,
		setLoading,
		totalCount,
		setTotalCount,
		searchQuery,
		debouncedSearchQuery,
		handleSearchChange,
		currentPage,
		rowsPerPage,
		handlePageChange,
		handleRowsPerPageChange,
		sortColumn,
		sortDirection,
		handleSortChange,
		statusFilter,
		selectedLessonTypeId,
		quickFilterGroups,
	} = useListPageTableState({
		storageKey: 'teachers',
		initialSortColumn: 'teacher',
		initialSortDirection: 'asc',
		lessonTypes,
	});

	const controller = useTeachersPageController({
		authLoading,
		hasAccess,
		navigate,
		currentPage,
		rowsPerPage,
		debouncedSearchQuery,
		statusFilter,
		selectedLessonTypeId,
		sortColumn,
		sortDirection,
		setLoading,
		setTotalCount,
	});

	if (!hasAccess) {
		return <Navigate to="/" replace />;
	}

	return (
		<div>
			<PageShell
				title={NAV_LABELS.teachers}
				description="Beheer alle docenten en hun profielgegevens"
				actions={<TeachersPageCreateButton onCreate={controller.handleCreate} />}
			>
				<DataTable
					data={controller.teachers}
					columns={controller.columns}
					searchQuery={searchQuery}
					onSearchChange={handleSearchChange}
					loading={loading}
					getRowKey={(t) => t.user_id}
					emptyMessage="Geen docenten gevonden"
					tableClassName="min-w-[56rem]"
					quickFilter={quickFilterGroups}
					serverPagination={{
						totalCount,
						currentPage,
						rowsPerPage,
						onPageChange: handlePageChange,
						onRowsPerPageChange: handleRowsPerPageChange,
					}}
					initialSortColumn={sortColumn || undefined}
					initialSortDirection={sortDirection || undefined}
					onSortChange={handleSortChange}
					rowActions={{
						onEdit: controller.handleEdit,
						onDelete: controller.handleDelete,
					}}
				/>
			</PageShell>

			<TeachersPageDialogs
				teacherFormDialog={controller.teacherFormDialog}
				setTeacherFormDialog={controller.setTeacherFormDialog}
				deleteDialog={controller.deleteDialog}
				setDeleteDialog={controller.setDeleteDialog}
				loadTeachers={controller.loadTeachers}
				navigate={navigate}
				confirmDelete={controller.confirmDelete}
			/>
		</div>
	);
}
