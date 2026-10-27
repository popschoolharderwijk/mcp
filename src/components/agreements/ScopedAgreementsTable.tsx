import { useNavigate } from 'react-router-dom';
import { AgreementsDataTable } from '@/components/agreements/AgreementsDataTable';
import { AgreementsPageCreateButton, AgreementsPageDialogs } from '@/components/agreements/AgreementsPageDialogs';
import { useActiveLessonTypes } from '@/hooks/useActiveLessonTypes';
import { useAgreementsPageController } from '@/hooks/useAgreementsPageController';
import { useAuth } from '@/hooks/useAuth';
import { useListPageTableState } from '@/hooks/useListPageTableState';
import { buildAgreementColumns, resolveOmittedAgreementPersonColumns } from '@/lib/agreements/agreementsTableColumns';

interface ScopedAgreementsTableProps {
	studentUserId?: string;
	teacherUserId?: string;
	canMutate: boolean;
	onAgreementsMutated?: () => void;
}

function resolveScopedAgreementsStorageKey(studentUserId?: string, teacherUserId?: string): string {
	if (studentUserId) return `student-agreements-${studentUserId}`;
	if (teacherUserId) return `teacher-agreements-${teacherUserId}`;
	return 'scoped-agreements';
}

export function ScopedAgreementsTable({
	studentUserId,
	teacherUserId,
	canMutate,
	onAgreementsMutated,
}: ScopedAgreementsTableProps) {
	const navigate = useNavigate();
	const { isLoading: authLoading } = useAuth();
	const { lessonTypes } = useActiveLessonTypes(true);
	const tableState = useListPageTableState({
		storageKey: resolveScopedAgreementsStorageKey(studentUserId, teacherUserId),
		initialSortColumn: 'created_at',
		initialSortDirection: 'desc',
		lessonTypes,
	});

	const { agreements, deleteDialog, setDeleteDialog, runAction } = useAgreementsPageController({
		authLoading,
		hasAccess: true,
		navigate,
		statusFilter: tableState.statusFilter,
		selectedLessonTypeId: tableState.selectedLessonTypeId,
		debouncedSearchQuery: tableState.debouncedSearchQuery,
		sortColumn: tableState.sortColumn,
		sortDirection: tableState.sortDirection,
		currentPage: tableState.currentPage,
		rowsPerPage: tableState.rowsPerPage,
		setLoading: tableState.setLoading,
		setTotalCount: tableState.setTotalCount,
		studentUserId,
		teacherUserId,
		onAgreementsMutated,
	});

	return (
		<div className="space-y-4">
			{canMutate && (
				<div className="flex justify-end">
					<AgreementsPageCreateButton navigate={navigate} studentUserId={studentUserId} />
				</div>
			)}

			<AgreementsDataTable
				agreements={agreements}
				columns={buildAgreementColumns(resolveOmittedAgreementPersonColumns({ studentUserId, teacherUserId }))}
				searchQuery={tableState.searchQuery}
				onSearchChange={tableState.handleSearchChange}
				loading={tableState.loading}
				totalCount={tableState.totalCount}
				currentPage={tableState.currentPage}
				rowsPerPage={tableState.rowsPerPage}
				onPageChange={tableState.handlePageChange}
				onRowsPerPageChange={tableState.handleRowsPerPageChange}
				sortColumn={tableState.sortColumn}
				sortDirection={tableState.sortDirection}
				onSortChange={tableState.handleSortChange}
				quickFilterGroups={tableState.quickFilterGroups}
				runAction={canMutate ? runAction : undefined}
			/>

			{canMutate && (
				<AgreementsPageDialogs
					deleteDialog={deleteDialog}
					setDeleteDialog={setDeleteDialog}
					onConfirmDelete={() => runAction({ kind: 'confirm-delete' })}
				/>
			)}
		</div>
	);
}
