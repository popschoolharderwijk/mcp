import type { DirectDebitBatch, DirectDebitBatchItem } from '@/lib/direct-debit/types';

export type DirectDebitBatchDetailView = 'loading' | 'not-found' | 'content';

export function resolveDirectDebitBatchDetailView(
	loading: boolean,
	batch: DirectDebitBatch | null,
): DirectDebitBatchDetailView {
	if (loading) return 'loading';
	if (!batch) return 'not-found';
	return 'content';
}

export function formatBatchItemStudentName(
	profile: { first_name: string | null; last_name: string | null; email: string } | null,
): string {
	if (!profile) return '—';

	const fullName = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
	return fullName || profile.email;
}

export function countInvoiceGenerationResults(results: Array<{ invoice_number?: string; error?: string }>): {
	ok: number;
	failed: number;
} {
	let ok = 0;
	let failed = 0;

	for (const result of results) {
		if (result.invoice_number && !result.error) {
			ok += 1;
			continue;
		}
		if (result.error) {
			failed += 1;
		}
	}

	return { ok, failed };
}

export function formatBatchApproveSuccessMessage(ok: number, failed: number): string {
	const failedSuffix = failed > 0 ? `, ${failed} fout` : '';
	return `Batch goedgekeurd — ${ok} factuur/invoices aangemaakt${failedSuffix}.`;
}

export function canEditBatchItemStatus(batchStatus: DirectDebitBatch['status']): boolean {
	return batchStatus === 'submitted' || batchStatus === 'closed';
}

export interface DirectDebitBatchItemRow extends DirectDebitBatchItem {
	profiles: { first_name: string | null; last_name: string | null; email: string } | null;
}

export function parseDirectDebitBatchLoadResult(
	batchData: unknown,
	itemsData: unknown,
): { batch: DirectDebitBatch | null; items: DirectDebitBatchItemRow[] } {
	return {
		batch: (batchData as DirectDebitBatch | null) ?? null,
		items: (itemsData ?? []) as DirectDebitBatchItemRow[],
	};
}
