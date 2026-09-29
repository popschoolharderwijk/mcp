import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import {
	buildBatchCloseUpdatePayload,
	buildBatchItemEndToEndMap,
	buildBatchItemStatusUpdatePayload,
	buildMandatePromotionUpdatePayload,
	planTransactionStatusUpdates,
	resolveBatchLookupColumn,
	resolveBatchLookupStrategy,
	resolveBatchLookupValue,
	resolveBatchNotFoundError,
	resolveMissingBatchLookupError,
	shouldCloseBatchAfterImport,
} from './applyStatusReportPure.ts';
import { buildImportResponse } from './buildImportResponse.ts';
import type { ApplyReportResult, BatchItemRow, BatchRow, ParsedReport } from './types.ts';

export { buildImportResponse };

export async function findBatchForReport(
	admin: SupabaseClient,
	report: ParsedReport,
	batchIdOverride: string | undefined,
): Promise<{ ok: true; batch: BatchRow } | { ok: false; response: Response }> {
	const lookup = resolveBatchLookupStrategy(report, batchIdOverride);
	if (lookup.kind === 'missing') {
		return {
			ok: false,
			response: jsonResponse(400, {
				error: resolveMissingBatchLookupError(),
			}),
		};
	}

	let batchQuery = admin.from('direct_debit_batches').select('id, message_id, status').limit(1);
	batchQuery = batchQuery.eq(resolveBatchLookupColumn(lookup), resolveBatchLookupValue(lookup));

	const { data: batch, error: batchErr } = await batchQuery.maybeSingle();
	if (batchErr) return { ok: false, response: jsonResponse(500, { error: batchErr.message }) };
	if (!batch) {
		return {
			ok: false,
			response: jsonResponse(404, {
				error: resolveBatchNotFoundError(lookup),
			}),
		};
	}
	return { ok: true, batch };
}

type PlannedStatusUpdate = ReturnType<typeof planTransactionStatusUpdates>['updates'][number];

async function applyPlannedBatchItemUpdates(
	admin: SupabaseClient,
	updates: PlannedStatusUpdate[],
	now: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
	for (const update of updates) {
		const { error: updErr } = await admin
			.from('direct_debit_batch_items')
			.update(buildBatchItemStatusUpdatePayload(update.status, update.reasonCode, now))
			.eq('id', update.itemId);
		if (updErr) {
			return { ok: false, message: `Update item ${update.itemId} faalde: ${updErr.message}` };
		}
	}
	return { ok: true };
}

export async function applyStatusReport(
	admin: SupabaseClient,
	batch: BatchRow,
	report: ParsedReport,
): Promise<{ ok: true; result: ApplyReportResult } | { ok: false; response: Response }> {
	const { data: items, error: itemsErr } = await admin
		.from('direct_debit_batch_items')
		.select('id, end_to_end_id, mandate_id, status, sequence_type')
		.eq('batch_id', batch.id);
	if (itemsErr) return { ok: false, response: jsonResponse(500, { error: itemsErr.message }) };

	const itemMap = buildBatchItemEndToEndMap((items ?? []) as BatchItemRow[]);
	const plan = planTransactionStatusUpdates(report.transactions, itemMap);
	const now = new Date().toISOString();

	const updateResult = await applyPlannedBatchItemUpdates(admin, plan.updates, now);
	if (!updateResult.ok) {
		return { ok: false, response: jsonResponse(500, { error: updateResult.message }) };
	}

	await promoteMandates(admin, plan.mandatesToPromote, now);
	const batchClosed = await tryCloseBatch(admin, batch, now);

	return {
		ok: true,
		result: {
			acceptedCount: plan.acceptedCount,
			rejectedCount: plan.rejectedCount,
			unknown: plan.unknownEndToEndIds,
			mandatesPromoted: plan.mandatesToPromote.size,
			batchClosed,
		},
	};
}

async function promoteMandates(admin: SupabaseClient, mandateIds: Set<string>, now: string): Promise<void> {
	if (mandateIds.size === 0) return;
	const { error: mandateErr } = await admin
		.from('sepa_mandates')
		.update(buildMandatePromotionUpdatePayload(now))
		.in('id', Array.from(mandateIds))
		.eq('sequence_type', 'FRST');
	if (mandateErr) console.error('Mandaat-promotie faalde', mandateErr);
}

async function tryCloseBatch(admin: SupabaseClient, batch: BatchRow, now: string): Promise<boolean> {
	const { count: openCount } = await admin
		.from('direct_debit_batch_items')
		.select('id', { count: 'exact', head: true })
		.eq('batch_id', batch.id)
		.in('status', ['pending', 'submitted']);

	if (!shouldCloseBatchAfterImport(openCount ?? 0, batch.status)) return false;

	const { error: closeErr } = await admin
		.from('direct_debit_batches')
		.update(buildBatchCloseUpdatePayload(now))
		.eq('id', batch.id);
	return !closeErr;
}
