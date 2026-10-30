import { DataTable, type DataTableColumn, type ServerSideDataTableControlProps } from '@/components/ui/data-table';
import type { AgreementAction } from '@/lib/agreements/agreementsPageActionHelpers';
import { AGREEMENT_COLUMNS } from '@/lib/agreements/agreementsTableColumns';
import type { AgreementTableRow } from '@/types/lesson-agreements';

export interface AgreementsDataTableProps extends ServerSideDataTableControlProps {
	agreements: AgreementTableRow[];
	runAction?: (action: AgreementAction) => void;
	columns?: DataTableColumn<AgreementTableRow>[];
}

export function AgreementsDataTable({
	agreements,
	searchQuery,
	onSearchChange,
	loading,
	totalCount,
	currentPage,
	rowsPerPage,
	onPageChange,
	onRowsPerPageChange,
	sortColumn,
	sortDirection,
	onSortChange,
	quickFilterGroups,
	runAction,
	columns = AGREEMENT_COLUMNS,
}: AgreementsDataTableProps) {
	return (
		<DataTable
			data={agreements}
			columns={columns}
			searchQuery={searchQuery}
			onSearchChange={onSearchChange}
			loading={loading}
			getRowKey={(row) => row.id}
			emptyMessage="Geen overeenkomsten gevonden"
			quickFilter={quickFilterGroups}
			serverPagination={{
				totalCount,
				currentPage,
				rowsPerPage,
				onPageChange,
				onRowsPerPageChange,
			}}
			initialSortColumn={sortColumn || undefined}
			initialSortDirection={sortDirection || undefined}
			onSortChange={onSortChange}
			rowActions={
				runAction
					? {
							onEdit: (agreement) => runAction({ kind: 'edit', agreement }),
							onDelete: (agreement) => runAction({ kind: 'delete', agreement }),
						}
					: undefined
			}
		/>
	);
}
