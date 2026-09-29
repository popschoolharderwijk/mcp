import { useCallback, useEffect, useState } from 'react';
import { LuDownload, LuMail } from 'react-icons/lu';
import { toast } from 'sonner';
import { AdminSiteGuard } from '@/components/auth/AdminSiteGuard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
import { supabase } from '@/integrations/supabase/client';
import { downloadInvoicePdf, formatInvoiceStudentName } from '@/lib/invoices/invoicePdfDownloadHelpers';
import { matchesInvoiceSearch } from '@/lib/invoices/invoiceSearchHelpers';
import { formatCentsEUR, INVOICE_STATUS_LABELS, type Invoice } from '@/lib/invoices/types';

interface Row extends Invoice {
	profiles?: { first_name: string | null; last_name: string | null; email: string } | null;
}

export default function Invoices() {
	return (
		<AdminSiteGuard>
			<List />
		</AdminSiteGuard>
	);
}

function List() {
	const [rows, setRows] = useState<Row[]>([]);
	const [loading, setLoading] = useState(true);
	const [downloading, setDownloading] = useState<string | null>(null);
	const [search, setSearch] = useState('');

	const load = useCallback(async () => {
		setLoading(true);
		const { data, error } = await supabase
			.from('invoices')
			.select('*, profiles!invoices_student_user_id_fkey(first_name,last_name,email)')
			.order('issue_date', { ascending: false })
			.limit(500);
		if (error) toast.error(error.message);
		setRows((data ?? []) as unknown as Row[]);
		setLoading(false);
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const handleDownload = async (id: string) => {
		setDownloading(id);
		const result = await downloadInvoicePdf((body) => supabase.functions.invoke('get-invoice-pdf', { body }), id);
		setDownloading(null);
		if (result.ok === false) {
			toast.error(result.message);
			return;
		}
		window.open(result.url, '_blank');
	};

	const filtered = rows.filter((row) => matchesInvoiceSearch(row, search));

	return (
		<PageShell title={NAV_LABELS.invoices} description="Overzicht van alle facturen">
			<div className="space-y-4">
				<div className="max-w-sm">
					<Input
						placeholder="Zoek op factuurnummer of leerling..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>
				{loading ? (
					<div className="py-8 text-center text-muted-foreground">Laden...</div>
				) : filtered.length === 0 ? (
					<div className="py-12 text-center text-muted-foreground">Nog geen facturen.</div>
				) : (
					<table className="w-full text-sm">
						<thead className="bg-muted/50 text-left">
							<tr>
								<th className="p-3">Factuurnr.</th>
								<th className="p-3">Leerling</th>
								<th className="p-3">Datum</th>
								<th className="p-3">Status</th>
								<th className="p-3">Verstuurd</th>
								<th className="p-3 text-right">Bedrag</th>
								<th className="p-3" />
							</tr>
						</thead>
						<tbody>
							{filtered.map((inv) => (
								<tr key={inv.id} className="border-t">
									<td className="p-3 font-medium">{inv.invoice_number}</td>
									<td className="p-3">{formatInvoiceStudentName(inv.profiles ?? null)}</td>
									<td className="p-3">{inv.issue_date}</td>
									<td className="p-3">
										<Badge variant="secondary">{INVOICE_STATUS_LABELS[inv.status]}</Badge>
									</td>
									<td className="p-3">
										{inv.sent_at ? (
											<LuMail className="h-4 w-4 text-primary" />
										) : (
											<span className="text-muted-foreground">—</span>
										)}
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
			</div>
		</PageShell>
	);
}
