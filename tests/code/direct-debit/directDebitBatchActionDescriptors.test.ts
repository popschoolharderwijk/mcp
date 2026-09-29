import { describe, expect, it } from 'bun:test';
import { buildDirectDebitBatchActionDescriptors } from '../../../src/lib/direct-debit/directDebitBatchActionDescriptors';
import type { DirectDebitBatch } from '../../../src/lib/direct-debit/types';

const batch = { item_count: 2, xml_storage_path: 'sepa/batch-1.xml' } as DirectDebitBatch;

describe('buildDirectDebitBatchActionDescriptors', () => {
	it('includes disabled approve descriptor for empty batch', () => {
		expect(
			buildDirectDebitBatchActionDescriptors(
				{
					showDraftActions: true,
					showGenerateXml: false,
					showDownloadXml: false,
					showClose: false,
				},
				{ item_count: 0 } as DirectDebitBatch,
				false,
			),
		).toEqual([
			{ kind: 'build', label: 'Vul concept', variant: 'default', disabled: false },
			{ kind: 'approve', label: 'Goedkeuren', variant: 'outline', disabled: true },
		]);
	});

	it('returns draft action descriptors for draft batches', () => {
		expect(
			buildDirectDebitBatchActionDescriptors(
				{
					showDraftActions: true,
					showGenerateXml: false,
					showDownloadXml: false,
					showClose: false,
				},
				batch,
				false,
			),
		).toEqual([
			{ kind: 'build', label: 'Vul concept', variant: 'default', disabled: false },
			{ kind: 'approve', label: 'Goedkeuren', variant: 'outline', disabled: false },
		]);
	});

	it('returns xml and close descriptors when enabled', () => {
		expect(
			buildDirectDebitBatchActionDescriptors(
				{
					showDraftActions: false,
					showGenerateXml: true,
					showDownloadXml: true,
					showClose: true,
				},
				batch,
				true,
			),
		).toEqual([
			{ kind: 'generate-xml', label: 'Genereer XML & aanbieden', variant: 'default', disabled: true },
			{ kind: 'download-xml', label: 'Download XML', variant: 'outline', disabled: false },
			{ kind: 'close', label: 'Markeer als afgerond', variant: 'outline', disabled: false },
		]);
	});
});
