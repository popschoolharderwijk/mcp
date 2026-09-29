import type { DirectDebitBatch } from '@/lib/direct-debit/types';

export interface DirectDebitBatchActionFlags {
	showDraftActions: boolean;
	showGenerateXml: boolean;
	showDownloadXml: boolean;
	showClose: boolean;
}

export function resolveDirectDebitBatchActionFlags(
	batch: Pick<DirectDebitBatch, 'status' | 'xml_storage_path'>,
): DirectDebitBatchActionFlags {
	return {
		showDraftActions: batch.status === 'draft',
		showGenerateXml: batch.status === 'approved',
		showDownloadXml: Boolean(batch.xml_storage_path),
		showClose: batch.status === 'submitted',
	};
}
