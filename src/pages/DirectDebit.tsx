import { useCallback, useEffect, useState } from 'react';
import { LuPlus } from 'react-icons/lu';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AdminSiteGuard } from '@/components/auth/AdminSiteGuard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
import { useAccountingSettings } from '@/hooks/useAccounting';
import { supabase } from '@/integrations/supabase/client';
import {
	buildDirectDebitBatchNumber,
	computeDefaultCollectionDate,
	mapDirectDebitBatchRows,
	resolveDirectDebitBatchTableView,
} from '@/lib/direct-debit/directDebitPageHelpers';
import { BATCH_STATUS_LABELS, type DirectDebitBatch, formatCentsEUR } from '@/lib/direct-debit/types';

export default function DirectDebit() {
	return (
		<AdminSiteGuard>
			<DirectDebitContent />
		</AdminSiteGuard>
	);
}

function DirectDebitBatchTableBody({ rows }: { rows: DirectDebitBatch[] }) {
	return (
		<table className="w-full text-sm">
			<thead className="bg-muted/50 text-left">
				<tr>
					<th className="p-3">Nummer</th>
					<th className="p-3">Incassodatum</th>
					<th className="p-3">Status</th>
					<th className="p-3 text-right">Regels</th>
					<th className="p-3 text-right">Totaal</th>
					<th className="p-3" />
				</tr>
			</thead>
			<tbody>
				{rows.map((batch) => (
					<tr key={batch.id} className="border-t">
						<td className="p-3 font-mono">{batch.batch_number}</td>
						<td className="p-3">{batch.collection_date}</td>
						<td className="p-3">
							<Badge variant={batch.status === 'draft' ? 'secondary' : 'default'}>
								{BATCH_STATUS_LABELS[batch.status]}
							</Badge>
						</td>
						<td className="p-3 text-right">{batch.item_count}</td>
						<td className="p-3 text-right">{formatCentsEUR(batch.total_amount_cents)}</td>
						<td className="p-3 text-right">
							<Link to={`/direct-debit/batches/${batch.id}`}>
								<Button size="sm" variant="outline">
									Openen
								</Button>
							</Link>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

function DirectDebitBatchTableContent({ loading, rows }: { loading: boolean; rows: DirectDebitBatch[] }) {
	const view = resolveDirectDebitBatchTableView(loading, rows.length);
	if (view === 'loading') {
		return <div className="p-8 text-center text-muted-foreground">Laden...</div>;
	}
	if (view === 'empty') {
		return <div className="p-8 text-center text-muted-foreground">Nog geen batches</div>;
	}
	return <DirectDebitBatchTableBody rows={rows} />;
}

function DirectDebitContent() {
	const [rows, setRows] = useState<DirectDebitBatch[]>([]);
	const [loading, setLoading] = useState(true);
	const [dialogOpen, setDialogOpen] = useState(false);
	const { settings } = useAccountingSettings();

	const load = useCallback(async () => {
		setLoading(true);
		const { data, error } = await supabase
			.from('direct_debit_batches')
			.select('*')
			.order('collection_date', { ascending: false });
		if (error) toast.error(error.message);
		setRows(mapDirectDebitBatchRows(data));
		setLoading(false);
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	return (
		<PageShell
			title={NAV_LABELS.directDebit}
			description="Beheer SEPA-incassobatches"
			actions={
				<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
					<DialogTrigger asChild>
						<Button>
							<LuPlus className="h-4 w-4 mr-2" /> Nieuwe batch
						</Button>
					</DialogTrigger>
					<NewBatchDialog
						defaultCollectionDay={settings?.sepa_collection_day ?? 27}
						onClose={() => setDialogOpen(false)}
						onCreated={() => {
							setDialogOpen(false);
							load();
						}}
					/>
				</Dialog>
			}
			contentClassName="p-0"
		>
			<DirectDebitBatchTableContent loading={loading} rows={rows} />
		</PageShell>
	);
}

function NewBatchDialog({
	defaultCollectionDay,
	onClose,
	onCreated,
}: {
	defaultCollectionDay: number;
	onClose: () => void;
	onCreated: () => void;
}) {
	const [collectionDate, setCollectionDate] = useState(() => computeDefaultCollectionDate(defaultCollectionDay));
	const [saving, setSaving] = useState(false);

	const handleSubmit = async () => {
		setSaving(true);
		const { error } = await supabase.from('direct_debit_batches').insert({
			batch_number: buildDirectDebitBatchNumber(collectionDate),
			collection_date: collectionDate,
			status: 'draft',
		});
		setSaving(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success('Batch aangemaakt');
		onCreated();
	};

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Nieuwe incassobatch</DialogTitle>
			</DialogHeader>
			<div className="space-y-3">
				<div className="space-y-1.5">
					<Label>Incassodatum</Label>
					<Input type="date" value={collectionDate} onChange={(e) => setCollectionDate(e.target.value)} />
				</div>
			</div>
			<DialogFooter>
				<Button variant="outline" onClick={onClose}>
					Annuleren
				</Button>
				<Button onClick={handleSubmit} disabled={saving}>
					{saving ? 'Opslaan...' : 'Aanmaken'}
				</Button>
			</DialogFooter>
		</DialogContent>
	);
}
