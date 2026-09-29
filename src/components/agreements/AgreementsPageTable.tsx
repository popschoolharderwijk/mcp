import type { NavigateFunction } from 'react-router-dom';
import { AgreementsPageCreateButton } from '@/components/agreements/AgreementsPageDialogs';
import { DataTable, type QuickFilterGroup } from '@/components/ui/data-table';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
import type { AgreementAction } from '@/lib/agreements/agreementsPageActionHelpers';
import { AGREEMENT_COLUMNS } from '@/lib/agreements/agreementsTableColumns';
import type { AgreementTableRow } from '@/types/lesson-agreements';

interface AgreementsPageTableProps {
	navigate: NavigateFunction;
	agreements: AgreementTableRow[];
	searchQuery: string;
	onSearchChange: (query: string) => void;
	loading: boolean;
	totalCount: number;
	currentPage: number;
	rowsPerPage: number;
	onPageChange: (page: number) => void;
	onRowsPerPageChange: (rows: number) => void;
	sortColumn: string | null;
	sortDirection: 'asc' | 'desc' | null;
	onSortChange: (column: string | null, direction: 'asc' | 'desc' | null) => void;
	quickFilterGroups: QuickFilterGroup[];
	runAction: (action: AgreementAction) => void;
}

export function AgreementsPageTable({
	navigate,
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
}: AgreementsPageTableProps) {
	return (
		<PageShell
			title={NAV_LABELS.agreements}
			description="Beheer lesovereenkomsten tussen leerlingen en docenten"
			actions={<AgreementsPageCreateButton navigate={navigate} />}
		>
			<DataTable
				data={agreements}
				columns={AGREEMENT_COLUMNS}
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
				rowActions={{
					onEdit: (agreement) => runAction({ kind: 'edit', agreement }),
					onDelete: (agreement) => runAction({ kind: 'delete', agreement }),
				}}
			/>
		</PageShell>
	);
}
