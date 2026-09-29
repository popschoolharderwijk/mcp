import { describe, expect, it } from 'bun:test';
import {
	resolveDirectDebitBatchActionHandler,
	resolveDirectDebitBatchActionIcon,
	resolveDirectDebitBatchActionKinds,
	shouldDisableDirectDebitApproveAction,
} from '../../../src/lib/direct-debit/directDebitBatchActionBarHelpers';

describe('resolveDirectDebitBatchActionKinds', () => {
	it('returns draft actions for draft batches', () => {
		expect(
			resolveDirectDebitBatchActionKinds({
				showDraftActions: true,
				showGenerateXml: false,
				showDownloadXml: false,
				showClose: false,
			}),
		).toEqual(['build', 'approve']);
	});

	it('returns xml and close actions when enabled', () => {
		expect(
			resolveDirectDebitBatchActionKinds({
				showDraftActions: false,
				showGenerateXml: true,
				showDownloadXml: true,
				showClose: true,
			}),
		).toEqual(['generate-xml', 'download-xml', 'close']);
	});
});

describe('shouldDisableDirectDebitApproveAction', () => {
	it('disables approve when busy or batch has no items', () => {
		expect(shouldDisableDirectDebitApproveAction(0, false)).toBe(true);
		expect(shouldDisableDirectDebitApproveAction(2, true)).toBe(true);
	});

	it('enables approve when batch has items and is not busy', () => {
		expect(shouldDisableDirectDebitApproveAction(2, false)).toBe(false);
	});
});

describe('resolveDirectDebitBatchActionIcon', () => {
	it('returns icon for build action', () => {
		expect(resolveDirectDebitBatchActionIcon('build')).toBeDefined();
	});

	it('returns icon for generate-xml action', () => {
		expect(resolveDirectDebitBatchActionIcon('generate-xml')).toBeDefined();
	});

	it('returns icon for download-xml action', () => {
		expect(resolveDirectDebitBatchActionIcon('download-xml')).toBeDefined();
	});

	it('returns null for approve action', () => {
		expect(resolveDirectDebitBatchActionIcon('approve')).toBeNull();
	});
});

describe('resolveDirectDebitBatchActionHandler', () => {
	it('returns build handler', () => {
		let buildCalled = false;
		const handlers = {
			onBuild: () => {
				buildCalled = true;
			},
			onApprove: () => {},
			onGenerateXml: () => {},
			onClose: () => {},
			onDownloadXml: () => {},
			batch: { xml_storage_path: 'sepa/batch.xml' },
		};
		resolveDirectDebitBatchActionHandler('build', handlers)();
		expect(buildCalled).toBe(true);
	});

	it('returns download handler with xml path', () => {
		let downloadedPath = '';
		const handlers = {
			onBuild: () => {},
			onApprove: () => {},
			onGenerateXml: () => {},
			onClose: () => {},
			onDownloadXml: (path: string) => {
				downloadedPath = path;
			},
			batch: { xml_storage_path: 'sepa/batch.xml' },
		};
		resolveDirectDebitBatchActionHandler('download-xml', handlers)();
		expect(downloadedPath).toBe('sepa/batch.xml');
	});

	it('returns close handler', () => {
		let closeCalled = false;
		const handlers = {
			onBuild: () => {},
			onApprove: () => {},
			onGenerateXml: () => {},
			onClose: () => {
				closeCalled = true;
			},
			onDownloadXml: () => {},
			batch: { xml_storage_path: 'sepa/batch.xml' },
		};
		resolveDirectDebitBatchActionHandler('close', handlers)();
		expect(closeCalled).toBe(true);
	});
});
