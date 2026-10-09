import { useCallback, useEffect, useState } from 'react';
import { LuPlus } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AdminSiteGuard } from '@/components/auth/AdminSiteGuard';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
import { useAccountingSettings } from '@/hooks/useAccounting';
import { supabase } from '@/integrations/supabase/client';
import { formatDbDateToUi } from '@/lib/date/date-format';
import { buildDirectDebitBatchColumns } from '@/lib/direct-debit/directDebitBatchTableColumns';
import {
	buildDirectDebitBatchNumber,
	computeDefaultCollectionDate,
	mapDirectDebitBatchRows,
} from '@/lib/direct-debit/directDebitPageHelpers';
import { BATCH_STATUS_LABELS, type DirectDebitBatch } from '@/lib/direct-debit/types';

const DIRECT_DEBIT_BATCH_COLUMNS = buildDirectDebitBatchColumns();

export default function DirectDebit() {
	return (
		<AdminSiteGuard>
			<DirectDebitContent />
		</AdminSiteGuard>
	);
}

function DirectDebitContent() {
	const navigate = useNavigate();
	const [rows, setRows] = useState<DirectDebitBatch[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
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
		>
			<DataTable
				data={rows}
				columns={DIRECT_DEBIT_BATCH_COLUMNS}
				searchQuery={search}
				onSearchChange={setSearch}
				searchPlaceholder="Zoek op nummer of status..."
				searchFields={[
					(batch) => batch.batch_number,
					(batch) => batch.collection_date,
					(batch) => formatDbDateToUi(batch.collection_date),
					(batch) => BATCH_STATUS_LABELS[batch.status],
				]}
				loading={loading}
				getRowKey={(batch) => batch.id}
				emptyMessage="Nog geen batches"
				initialSortColumn="collection_date"
				initialSortDirection="desc"
				rowActions={{ onEdit: (batch) => navigate(`/direct-debit/batches/${batch.id}`) }}
			/>
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
