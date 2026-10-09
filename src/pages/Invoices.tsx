import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AdminSiteGuard } from '@/components/auth/AdminSiteGuard';
import { DataTable } from '@/components/ui/data-table';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
import { supabase } from '@/integrations/supabase/client';
import { downloadInvoicePdf } from '@/lib/invoices/invoicePdfDownloadHelpers';
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
	const [rows, setRows] = useState<InvoiceListRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [downloading, setDownloading] = useState<string | null>(null);
	const [search, setSearch] = useState('');

	const load = useCallback(async () => {
		setLoading(true);
		const { data, error } = await supabase
			.from('invoices')
			.select('*, profiles!invoices_student_user_id_fkey(first_name,last_name,email,avatar_url)')
			.order('issue_date', { ascending: false })
			.limit(500);
		if (error) toast.error(error.message);
		setRows((data ?? []) as unknown as InvoiceListRow[]);
		setLoading(false);
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const handleDownload = async (invoice: InvoiceListRow) => {
		if (!invoice.pdf_storage_path) {
			toast.error('Geen PDF beschikbaar.');
			return;
		}
		if (downloading === invoice.id) return;
		setDownloading(invoice.id);
		const result = await downloadInvoicePdf(
			(body) => supabase.functions.invoke('get-invoice-pdf', { body }),
			invoice.id,
		);
		setDownloading(null);
		if (result.ok === false) {
			toast.error(result.message);
			return;
		}
		window.open(result.url, '_blank');
	};

	return (
		<PageShell title={NAV_LABELS.invoices} description="Overzicht van alle facturen">
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
		</PageShell>
	);
}
