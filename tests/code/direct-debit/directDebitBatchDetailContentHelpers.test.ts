import { describe, expect, it } from 'bun:test';
import { resolveDirectDebitBatchActionFlags } from '../../../src/lib/direct-debit/directDebitBatchDetailContentHelpers';

const baseBatch = {
	id: 'batch-1',
	batch_number: 1,
	collection_date: '2026-01-01',
	item_count: 2,
	total_amount_cents: 5000,
	xml_storage_path: null,
};

describe('resolveDirectDebitBatchActionFlags', () => {
	it('shows draft actions for draft batches', () => {
		expect(resolveDirectDebitBatchActionFlags({ ...baseBatch, status: 'draft' })).toEqual({
			showDraftActions: true,
			showGenerateXml: false,
			showDownloadXml: false,
			showClose: false,
		});
	});

	it('shows generate action for approved batches', () => {
		expect(resolveDirectDebitBatchActionFlags({ ...baseBatch, status: 'approved' })).toEqual({
			showDraftActions: false,
			showGenerateXml: true,
			showDownloadXml: false,
			showClose: false,
		});
	});

	it('shows download and close actions when applicable', () => {
		expect(
			resolveDirectDebitBatchActionFlags({
				...baseBatch,
				status: 'submitted',
				xml_storage_path: 'sepa/batch-1.xml',
			}),
		).toEqual({
			showDraftActions: false,
			showGenerateXml: false,
			showDownloadXml: true,
			showClose: true,
		});
	});
});
