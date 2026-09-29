import { useCallback, useEffect, useState } from 'react';
import { LuDownload } from 'react-icons/lu';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
import { supabase } from '@/integrations/supabase/client';
import { formatCentsEUR, INVOICE_STATUS_LABELS, type Invoice } from '@/lib/invoices/types';

export default function MyInvoices() {
	const [invoices, setInvoices] = useState<Invoice[]>([]);
	const [loading, setLoading] = useState(true);
	const [downloading, setDownloading] = useState<string | null>(null);

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

	const handleDownload = async (id: string) => {
		setDownloading(id);
		const { data, error } = await supabase.functions.invoke('get-invoice-pdf', { body: { invoice_id: id } });
		setDownloading(null);
		if (error) {
			toast.error(error.message);
			return;
		}
		const url = (data as { signed_url?: string } | null)?.signed_url;
		if (url) window.open(url, '_blank');
	};

	return (
		<PageShell title={NAV_LABELS.myInvoices} description="Overzicht van al je facturen" contentClassName="p-0">
			{loading ? (
				<div className="py-8 text-center text-muted-foreground">Laden...</div>
			) : invoices.length === 0 ? (
				<div className="py-12 text-center text-muted-foreground">Je hebt nog geen facturen.</div>
			) : (
				<table className="w-full text-sm">
					<thead className="bg-muted/50 text-left">
						<tr>
							<th className="p-3">Factuurnr.</th>
							<th className="p-3">Datum</th>
							<th className="p-3">Vervaldatum</th>
							<th className="p-3">Status</th>
							<th className="p-3 text-right">Bedrag</th>
							<th className="p-3" />
						</tr>
					</thead>
					<tbody>
						{invoices.map((inv) => (
							<tr key={inv.id} className="border-t">
								<td className="p-3 font-medium">{inv.invoice_number}</td>
								<td className="p-3">{inv.issue_date}</td>
								<td className="p-3">{inv.due_date}</td>
								<td className="p-3">
									<Badge variant="secondary">{INVOICE_STATUS_LABELS[inv.status]}</Badge>
								</td>
								<td className="p-3 text-right">{formatCentsEUR(inv.amount_total_cents)}</td>
								<td className="p-3 text-right">
									<Button
										size="sm"
										variant="outline"
										disabled={!inv.pdf_storage_path || downloading === inv.id}
										onClick={() => handleDownload(inv.id)}
									>
										<LuDownload className="h-4 w-4 mr-1" /> PDF
									</Button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</PageShell>
	);
}
