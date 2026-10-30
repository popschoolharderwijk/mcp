import { useCallback } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { NavPageShell } from '@/components/ui/nav-page-shell';
import { useInvoiceListPageState } from '@/hooks/useInvoiceListPageState';
import { supabase } from '@/integrations/supabase/client';
import { buildMyInvoiceColumns, InvoicePdfDownloadButton } from '@/lib/invoices/invoiceTableColumns';
import { INVOICE_STATUS_LABELS, type Invoice } from '@/lib/invoices/types';

const MY_INVOICE_COLUMNS = buildMyInvoiceColumns();

export default function MyInvoices() {
	const loadQuery = useCallback(
		() => supabase.from('invoices').select('*').order('issue_date', { ascending: false }),
		[],
	);
	const {
		rows: invoices,
		loading,
		downloading,
		handleDownload,
		search,
		setSearch,
	} = useInvoiceListPageState<Invoice>(loadQuery);

	return (
		<NavPageShell item="myInvoices">
			<DataTable
				data={invoices}
				columns={MY_INVOICE_COLUMNS}
				searchQuery={search}
				onSearchChange={setSearch}
				searchPlaceholder="Zoek op factuurnummer..."
				searchFields={[(invoice) => invoice.invoice_number, (invoice) => INVOICE_STATUS_LABELS[invoice.status]]}
				loading={loading}
				getRowKey={(invoice) => invoice.id}
				emptyMessage="Je hebt nog geen facturen."
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
