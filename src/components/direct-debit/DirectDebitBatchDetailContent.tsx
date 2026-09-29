import { LuArrowLeft } from 'react-icons/lu';
import { Link } from 'react-router-dom';
import { DirectDebitBatchActionBar } from '@/components/direct-debit/DirectDebitBatchActionBar';
import { DirectDebitBatchItemRowView } from '@/components/direct-debit/DirectDebitBatchItemRowView';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { resolveDirectDebitBatchActionFlags } from '@/lib/direct-debit/directDebitBatchDetailContentHelpers';
import type { DirectDebitBatchItemRow } from '@/lib/direct-debit/directDebitBatchDetailHelpers';
import {
	BATCH_STATUS_LABELS,
	type BatchItemStatus,
	type DirectDebitBatch,
	formatCentsEUR,
} from '@/lib/direct-debit/types';

interface DirectDebitBatchDetailContentProps {
	batch: DirectDebitBatch;
	items: DirectDebitBatchItemRow[];
	busy: boolean;
	itemStatusEditable: boolean;
	onBuild: () => void;
	onApprove: () => void;
	onGenerateXml: () => void;
	onClose: () => void;
	onDownloadXml: (path: string) => void;
	onUpdateItemStatus: (itemId: string, status: BatchItemStatus) => void;
}

export function DirectDebitBatchDetailContent({
	batch,
	items,
	busy,
	itemStatusEditable,
	onBuild,
	onApprove,
	onGenerateXml,
	onClose,
	onDownloadXml,
	onUpdateItemStatus,
}: DirectDebitBatchDetailContentProps) {
	const actionFlags = resolveDirectDebitBatchActionFlags(batch);

	return (
		<div className="space-y-6">
			<PageHeader
				title={`Batch ${batch.batch_number}`}
				subtitle={`Incassodatum ${batch.collection_date} — ${BATCH_STATUS_LABELS[batch.status]}`}
				actions={
					<Link to="/direct-debit">
						<Button variant="ghost" size="sm">
							<LuArrowLeft className="h-4 w-4 mr-2" /> Terug
						</Button>
					</Link>
				}
			/>

			<Card>
				<CardHeader>
					<CardTitle>Overzicht</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-4">
					<Stat label="Status" value={BATCH_STATUS_LABELS[batch.status]} />
					<Stat label="Regels" value={String(batch.item_count)} />
					<Stat label="Totaal" value={formatCentsEUR(batch.total_amount_cents)} />
					<Stat label="Incassodatum" value={batch.collection_date} />
				</CardContent>
			</Card>

			<DirectDebitBatchActionBar
				batch={batch}
				busy={busy}
				flags={actionFlags}
				onBuild={onBuild}
				onApprove={onApprove}
				onGenerateXml={onGenerateXml}
				onClose={onClose}
				onDownloadXml={onDownloadXml}
			/>

			<Card>
				<CardContent className="p-0">
					{items.length === 0 ? (
						<div className="p-8 text-center text-muted-foreground">
							Nog geen regels. Klik "Vul concept" om actieve SEPA-overeenkomsten in te lezen.
						</div>
					) : (
						<table className="w-full text-sm">
							<thead className="bg-muted/50 text-left">
								<tr>
									<th className="p-3">Leerling</th>
									<th className="p-3">Omschrijving</th>
									<th className="p-3">Type</th>
									<th className="p-3 text-right">Bedrag</th>
									<th className="p-3">Status</th>
								</tr>
							</thead>
							<tbody>
								{items.map((item) => (
									<DirectDebitBatchItemRowView
										key={item.id}
										item={item}
										itemStatusEditable={itemStatusEditable}
										onUpdateItemStatus={onUpdateItemStatus}
									/>
								))}
							</tbody>
						</table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
			<div className="text-lg font-semibold">{value}</div>
		</div>
	);
}
