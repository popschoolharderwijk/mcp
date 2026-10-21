import { useCallback, useEffect, useState } from 'react';
import { LuExternalLink, LuFileDown } from 'react-icons/lu';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
import { supabase } from '@/integrations/supabase/client';
import { downloadInvoicePdf } from '@/lib/invoices/invoicePdfDownloadHelpers';
import { InvoicePdfDownloadButton } from '@/lib/invoices/invoiceTableColumns';
import { MY_INVOICE_COLUMNS } from '@/lib/invoices/myInvoiceColumns';
import { type MyInvoiceRow, mergeMyInvoices } from '@/lib/invoices/myInvoiceHelpers';
import type { Invoice } from '@/lib/invoices/types';

export default function MyInvoices() {
	const [invoices, setInvoices] = useState<MyInvoiceRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);
	const [downloading, setDownloading] = useState<string | null>(null);
	const [search, setSearch] = useState('');

	const load = useCallback(async () => {
		setLoading(true);
		setLoadError(false);
		try {
			const [own, stripe] = await Promise.all([
				supabase.from('invoices').select('*').order('issue_date', { ascending: false }),
				supabase.from('subscription_invoices').select('*').order('created_at', { ascending: false }),
			]);
			if (own.error || stripe.error) throw own.error ?? stripe.error;
			setInvoices(mergeMyInvoices((own.data ?? []) as Invoice[], stripe.data ?? []));
		} catch (error) {
			console.error('Error loading my invoices:', error);
			setLoadError(true);
		} finally {
			setLoading(false);
		}
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
		window.open(result.url, '_blank', 'noopener,noreferrer');
	};

	return (
		<PageShell title={NAV_LABELS.myInvoices} description="Overzicht van al je facturen">
			{loadError && (
				<div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-destructive">
					<p>Je facturen konden niet worden geladen.</p>
					<Button variant="outline" onClick={() => void load()} disabled={loading}>
						Probeer opnieuw
					</Button>
				</div>
			)}
			<DataTable
				data={invoices}
				columns={MY_INVOICE_COLUMNS}
				searchQuery={search}
				onSearchChange={setSearch}
				searchPlaceholder="Zoek op factuurnummer..."
				searchFields={[
					(invoice) => invoice.invoice_number,
					(invoice) => invoice.status_label,
					(invoice) => invoice.source,
				]}
				loading={loading}
				getRowKey={(invoice) => invoice.id}
				emptyMessage={loadError ? 'Facturen niet beschikbaar.' : 'Je hebt nog geen facturen.'}
				initialSortColumn="issue_date"
				initialSortDirection="desc"
				rowActions={{
					render: (row) => {
						const invoice = row.invoice;
						if (invoice) {
							return (
								<InvoicePdfDownloadButton
									disabled={!invoice.pdf_storage_path || downloading === invoice.id}
									onClick={() => void handleDownload(invoice)}
								/>
							);
						}
						return (
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									disabled={!row.hosted_url}
									aria-label="Factuur openen in Stripe"
									title="Factuur openen in Stripe"
									onClick={() => {
										if (row.hosted_url)
											window.open(row.hosted_url, '_blank', 'noopener,noreferrer');
									}}
								>
									<LuExternalLink className="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									disabled={!row.pdf_url}
									aria-label="Stripe-PDF downloaden"
									title="Stripe-PDF downloaden"
									onClick={() => {
										if (row.pdf_url) window.open(row.pdf_url, '_blank', 'noopener,noreferrer');
									}}
								>
									<LuFileDown className="h-4 w-4" />
								</Button>
							</div>
						);
					},
				}}
			/>
		</PageShell>
	);
}
