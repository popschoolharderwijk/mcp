import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { downloadInvoicePdf } from '@/lib/invoices/invoicePdfDownloadHelpers';

async function runInvoiceListLoad<T>(
	setLoading: (loading: boolean) => void,
	setRows: (rows: T[]) => void,
	query: () => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<void> {
	setLoading(true);
	const { data, error } = await query();
	if (error) toast.error(error.message);
	setRows((data ?? []) as T[]);
	setLoading(false);
}

function useInvoicePdfDownload() {
	const [downloading, setDownloading] = useState<string | null>(null);

	const handleDownload = useCallback(
		async (invoice: { id: string; pdf_storage_path: string | null }) => {
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
		},
		[downloading],
	);

	return { downloading, handleDownload };
}

export function useInvoiceListPageState<T>(
	loadQuery: () => PromiseLike<{ data: unknown; error: { message: string } | null }>,
) {
	const [rows, setRows] = useState<T[]>([]);
	const [loading, setLoading] = useState(true);
	const { downloading, handleDownload } = useInvoicePdfDownload();
	const [search, setSearch] = useState('');

	const load = useCallback(async () => {
		await runInvoiceListLoad(setLoading, setRows, loadQuery);
	}, [loadQuery]);

	useEffect(() => {
		void load();
	}, [load]);

	return { rows, loading, downloading, handleDownload, search, setSearch };
}
