import type { SupabaseClient } from '@supabase/supabase-js';
import {
	countInvoiceGenerationResults,
	formatBatchApproveSuccessMessage,
} from '@/lib/direct-debit/directDebitBatchDetailHelpers';
import { resolveSignedStorageUrlResult } from '@/lib/direct-debit/signedUrlHelpers';

interface InvoiceGenerationInvokeResult {
	results?: Array<{ invoice_number?: string; error?: string }>;
}

function parseInvoiceGenerationResults(
	invResp: InvoiceGenerationInvokeResult | null,
): ReturnType<typeof countInvoiceGenerationResults> {
	return countInvoiceGenerationResults(invResp?.results ?? []);
}

export async function approveDirectDebitBatch(
	supabase: SupabaseClient,
	batchId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
	const { error } = await supabase
		.from('direct_debit_batches')
		.update({ status: 'approved', approved_at: new Date().toISOString() })
		.eq('id', batchId);
	if (error) return { ok: false, error: error.message };
	return { ok: true };
}

export async function generateInvoicesForDirectDebitBatch(
	supabase: SupabaseClient,
	batchId: string,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
	const { data: invResp, error: invErr } = await supabase.functions.invoke('generate-invoice', {
		body: { batch_id: batchId, send_email: true },
	});
	if (invErr) {
		return { ok: false, error: `Factuurgeneratie faalde: ${invErr.message}` };
	}

	const counts = parseInvoiceGenerationResults(invResp as InvoiceGenerationInvokeResult | null);
	return { ok: true, message: formatBatchApproveSuccessMessage(counts.ok, counts.failed) };
}
export async function createSignedSepaXmlDownloadUrl(
	supabase: SupabaseClient,
	path: string,
): Promise<{ ok: true; signedUrl: string } | { ok: false; error: string }> {
	const { data, error } = await supabase.storage.from('sepa-batches').createSignedUrl(path, 60);
	return resolveSignedStorageUrlResult(data, error);
}

export async function finalizeDirectDebitBatchAfterXml(supabase: SupabaseClient, batchId: string): Promise<void> {
	const now = new Date().toISOString();
	await supabase.from('direct_debit_batches').update({ status: 'submitted', submitted_at: now }).eq('id', batchId);
	await supabase
		.from('direct_debit_batch_items')
		.update({ status: 'submitted', status_updated_at: now })
		.eq('batch_id', batchId)
		.eq('status', 'pending');
}

export function resolveSepaXmlStoragePath(data: unknown): string | null {
	return (data as { storage_path?: string } | null)?.storage_path ?? null;
}
