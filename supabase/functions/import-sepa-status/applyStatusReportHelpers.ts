import type { BatchItemRow, ParsedReport, TxResult } from './types.ts';

export type BatchLookupStrategy =
	| { kind: 'message-id'; messageId: string }
	| { kind: 'batch-id'; batchId: string }
	| { kind: 'missing' };

export function resolveBatchLookupStrategy(
	report: ParsedReport,
	batchIdOverride: string | undefined,
): BatchLookupStrategy {
	if (report.original_message_id) {
		return { kind: 'message-id', messageId: report.original_message_id };
	}
	if (batchIdOverride) {
		return { kind: 'batch-id', batchId: batchIdOverride };
	}
	return { kind: 'missing' };
}

export function buildBatchItemEndToEndMap(items: BatchItemRow[]): Map<string, BatchItemRow> {
	return new Map(items.map((item) => [item.end_to_end_id, item]));
}

export interface TransactionStatusPlan {
	itemId: string;
	status: TxResult['status'];
	reasonCode: string | null;
}

export interface PlannedTransactionStatusUpdates {
	updates: TransactionStatusPlan[];
	acceptedCount: number;
	rejectedCount: number;
	unknownEndToEndIds: string[];
	mandatesToPromote: Set<string>;
}

export function planTransactionStatusUpdates(
	transactions: TxResult[],
	itemMap: Map<string, BatchItemRow>,
): PlannedTransactionStatusUpdates {
	const updates: TransactionStatusPlan[] = [];
	const unknownEndToEndIds: string[] = [];
	const mandatesToPromote = new Set<string>();
	let acceptedCount = 0;
	let rejectedCount = 0;

	for (const tx of transactions) {
		const item = itemMap.get(tx.end_to_end_id);
		if (!item) {
			unknownEndToEndIds.push(tx.end_to_end_id);
			continue;
		}
		if (tx.status === 'submitted') continue;

		updates.push({
			itemId: item.id,
			status: tx.status,
			reasonCode: tx.reason_code,
		});

		if (tx.status === 'accepted') {
			acceptedCount += 1;
			if (item.sequence_type === 'FRST') mandatesToPromote.add(item.mandate_id);
			continue;
		}

		if (tx.status === 'rejected') {
			rejectedCount += 1;
		}
	}

	return { updates, acceptedCount, rejectedCount, unknownEndToEndIds, mandatesToPromote };
}

export function shouldCloseBatchAfterImport(openCount: number, batchStatus: string): boolean {
	return openCount === 0 && batchStatus === 'submitted';
}

export function buildBatchItemStatusUpdatePayload(
	status: TxResult['status'],
	reasonCode: string | null,
	now: string,
): { status: TxResult['status']; reason_code: string | null; status_updated_at: string } {
	return { status, reason_code: reasonCode, status_updated_at: now };
}

export function buildMandatePromotionUpdatePayload(now: string): {
	sequence_type: 'RCUR';
	first_used_at: string;
	status: 'active';
} {
	return { sequence_type: 'RCUR', first_used_at: now, status: 'active' };
}

export function buildBatchCloseUpdatePayload(now: string): { status: 'closed'; closed_at: string } {
	return { status: 'closed', closed_at: now };
}

export function resolveBatchNotFoundError(lookup: Exclude<BatchLookupStrategy, { kind: 'missing' }>): string {
	const lookupKey = lookup.kind === 'message-id' ? lookup.messageId : lookup.batchId;
	return `Geen batch gevonden voor MsgId=${lookupKey}`;
}

export function resolveMissingBatchLookupError(): string {
	return 'Kon batch niet bepalen: geen OrgnlMsgId in XML en geen batch_id meegegeven';
}

export function resolveBatchLookupColumn(
	lookup: Exclude<BatchLookupStrategy, { kind: 'missing' }>,
): 'message_id' | 'id' {
	return lookup.kind === 'message-id' ? 'message_id' : 'id';
}

export function resolveBatchLookupValue(lookup: Exclude<BatchLookupStrategy, { kind: 'missing' }>): string {
	return lookup.kind === 'message-id' ? lookup.messageId : lookup.batchId;
}
