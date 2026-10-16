import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { PageShell } from '@/components/ui/page-shell';
import type { useAccountingReportPage } from '@/hooks/useAccountingReportPage';
import type { AccountingReportTableView } from '@/lib/reports/accountingReportContentHelpers';

type AccountingReportPageState = ReturnType<typeof useAccountingReportPage>;

interface AccountingReportInvoiceTableSectionProps {
	tableView: AccountingReportTableView;
	state: AccountingReportPageState;
}

export function AccountingReportInvoiceTableSection({ tableView, state }: AccountingReportInvoiceTableSectionProps) {
	const [search, setSearch] = useState('');

	return (
		<PageShell title="Facturen in periode" loading={tableView === 'skeleton'}>
			<DataTable
				data={state.report?.invoices ?? []}
				columns={state.invoiceColumns}
				searchQuery={search}
				onSearchChange={setSearch}
				searchPlaceholder="Zoeken op leerling, kostenplaats of factuurnummer..."
				searchFields={[(row) => row.student_name, (row) => row.cost_center, (row) => row.stripe_invoice_id]}
				getRowKey={(row) => row.invoice_id}
				emptyMessage="Geen facturen gevonden voor deze periode."
				initialSortColumn="period_start"
				initialSortDirection="asc"
				rowsPerPage={25}
				paginated
			/>
		</PageShell>
	);
}
