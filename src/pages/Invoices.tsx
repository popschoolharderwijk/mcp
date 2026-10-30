import { useCallback } from 'react';
import { AdminSiteGuard } from '@/components/auth/AdminSiteGuard';
import { DataTable } from '@/components/ui/data-table';
import { NavPageShell } from '@/components/ui/nav-page-shell';
import { useInvoiceListPageState } from '@/hooks/useInvoiceListPageState';
import { supabase } from '@/integrations/supabase/client';
import { invoiceSearchHaystack } from '@/lib/invoices/invoiceSearchHelpers';
import {
	buildInvoiceListColumns,
	type InvoiceListRow,
	InvoicePdfDownloadButton,
} from '@/lib/invoices/invoiceTableColumns';

const INVOICE_COLUMNS = buildInvoiceListColumns();

export default function Invoices() {
	return (
		<AdminSiteGuard>
			<List />
		</AdminSiteGuard>
	);
}

function List() {
	const loadQuery = useCallback(
		() =>
			supabase
				.from('invoices')
				.select('*, profiles!invoices_student_user_id_fkey(first_name,last_name,email,avatar_url)')
				.order('issue_date', { ascending: false })
				.limit(500),
		[],
	);
	const { rows, loading, downloading, handleDownload, search, setSearch } =
		useInvoiceListPageState<InvoiceListRow>(loadQuery);

	return (
		<NavPageShell item="invoices">
			<DataTable
				data={rows}
				columns={INVOICE_COLUMNS}
				searchQuery={search}
				onSearchChange={setSearch}
				searchPlaceholder="Zoek op factuurnummer of leerling..."
				searchFields={[(row) => invoiceSearchHaystack(row)]}
				loading={loading}
				getRowKey={(row) => row.id}
				emptyMessage="Nog geen facturen."
				initialSortColumn="issue_date"
				initialSortDirection="desc"
				rowActions={{
					render: (invoice) => (
						<InvoicePdfDownloadButton
							disabled={!invoice.pdf_storage_path || downloading === invoice.id}
							onClick={() => handleDownload(invoice)}
						/>
					),
				}}
			/>
		</NavPageShell>
	);
}
