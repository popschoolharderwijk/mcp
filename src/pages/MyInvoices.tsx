import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/data-table';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
import { supabase } from '@/integrations/supabase/client';
import { downloadInvoicePdf } from '@/lib/invoices/invoicePdfDownloadHelpers';
import { buildMyInvoiceColumns, InvoicePdfDownloadButton } from '@/lib/invoices/invoiceTableColumns';
import { INVOICE_STATUS_LABELS, type Invoice } from '@/lib/invoices/types';

const MY_INVOICE_COLUMNS = buildMyInvoiceColumns();

export default function MyInvoices() {
	const [invoices, setInvoices] = useState<Invoice[]>([]);
	const [loading, setLoading] = useState(true);
	const [downloading, setDownloading] = useState<string | null>(null);
	const [search, setSearch] = useState('');

	const load = useCallback(async () => {
		setLoading(true);
		const { data, error } = await supabase.from('invoices').select('*').order('issue_date', { ascending: false });
		if (error) toast.error(error.message);
		setInvoices((data ?? []) as unknown as Invoice[]);
		setLoading(false);
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const handleDownload = async (invoice: Invoice) => {
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
		<PageShell title={NAV_LABELS.myInvoices} description="Overzicht van al je facturen">
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
		</PageShell>
	);
}
