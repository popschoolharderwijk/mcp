import { Badge } from '@/components/ui/badge';
import type { DataTableColumn } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DirectDebitBatchItemRow } from '@/lib/direct-debit/directDebitBatchDetailHelpers';
import { formatBatchItemStudentName } from '@/lib/direct-debit/directDebitBatchDetailHelpers';
import { type BatchItemStatus, formatCentsEUR, ITEM_STATUS_LABELS } from '@/lib/direct-debit/types';

interface BuildDirectDebitBatchItemColumnsParams {
	itemStatusEditable: boolean;
	onUpdateItemStatus: (itemId: string, status: BatchItemStatus) => void;
}

function BatchItemStatusCell({
	item,
	itemStatusEditable,
	onUpdateItemStatus,
}: {
	item: DirectDebitBatchItemRow;
	itemStatusEditable: boolean;
	onUpdateItemStatus: (itemId: string, status: BatchItemStatus) => void;
}) {
	if (!itemStatusEditable) {
		return <Badge variant="secondary">{ITEM_STATUS_LABELS[item.status]}</Badge>;
	}

	return (
		<Select value={item.status} onValueChange={(value) => onUpdateItemStatus(item.id, value as BatchItemStatus)}>
			<SelectTrigger className="h-8 w-36">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{(Object.keys(ITEM_STATUS_LABELS) as BatchItemStatus[]).map((status) => (
					<SelectItem key={status} value={status}>
						{ITEM_STATUS_LABELS[status]}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

export function buildDirectDebitBatchItemColumns({
	itemStatusEditable,
	onUpdateItemStatus,
}: BuildDirectDebitBatchItemColumnsParams): DataTableColumn<DirectDebitBatchItemRow>[] {
	return [
		{
			key: 'student',
			label: 'Leerling',
			sortValue: (item) => formatBatchItemStudentName(item.profiles),
			render: (item) => formatBatchItemStudentName(item.profiles),
		},
		{
			key: 'remittance_info',
			label: 'Omschrijving',
			render: (item) => item.remittance_info,
		},
		{
			key: 'sequence_type',
			label: 'Type',
			render: (item) => <Badge variant="outline">{item.sequence_type}</Badge>,
		},
		{
			key: 'amount_cents',
			label: 'Bedrag',
			className: 'text-right',
			sortValue: (item) => item.amount_cents,
			render: (item) => formatCentsEUR(item.amount_cents),
		},
		{
			key: 'status',
			label: 'Status',
			sortValue: (item) => ITEM_STATUS_LABELS[item.status],
			render: (item) => (
				<BatchItemStatusCell
					item={item}
					itemStatusEditable={itemStatusEditable}
					onUpdateItemStatus={onUpdateItemStatus}
				/>
			),
		},
	];
}
