import { Badge } from '@/components/ui/badge';
import type { DataTableColumn } from '@/components/ui/data-table';
import { formatDbDateToUi } from '@/lib/date/date-format';
import { BATCH_STATUS_LABELS, type DirectDebitBatch, formatCentsEUR } from '@/lib/direct-debit/types';

export function buildDirectDebitBatchColumns(): DataTableColumn<DirectDebitBatch>[] {
	return [
		{
			key: 'batch_number',
			label: 'Nummer',
			render: (batch) => <span className="font-mono">{batch.batch_number}</span>,
		},
		{
			key: 'collection_date',
			label: 'Incassodatum',
			sortValue: (batch) => batch.collection_date,
			render: (batch) => formatDbDateToUi(batch.collection_date),
		},
		{
			key: 'status',
			label: 'Status',
			sortValue: (batch) => BATCH_STATUS_LABELS[batch.status],
			render: (batch) => (
				<Badge variant={batch.status === 'draft' ? 'secondary' : 'default'}>
					{BATCH_STATUS_LABELS[batch.status]}
				</Badge>
			),
		},
		{
			key: 'item_count',
			label: 'Regels',
			className: 'text-right',
			sortValue: (batch) => batch.item_count,
			render: (batch) => batch.item_count,
		},
		{
			key: 'total_amount_cents',
			label: 'Totaal',
			className: 'text-right',
			sortValue: (batch) => batch.total_amount_cents,
			render: (batch) => formatCentsEUR(batch.total_amount_cents),
		},
	];
}
