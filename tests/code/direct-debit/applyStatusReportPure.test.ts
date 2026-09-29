import { describe, expect, it } from 'bun:test';
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
} from '../../../supabase/functions/import-sepa-status/applyStatusReportPure';

const items = [
	{
		id: 'item-1',
		end_to_end_id: 'e2e-1',
		mandate_id: 'mandate-1',
		status: 'submitted',
		sequence_type: 'FRST',
	},
];

describe('resolveBatchLookupStrategy', () => {
	it('prefers original message id from report', () => {
		expect(resolveBatchLookupStrategy({ original_message_id: 'msg-1' } as never, 'batch-1')).toEqual({
			kind: 'message-id',
			messageId: 'msg-1',
		});
	});

	it('falls back to batch id override', () => {
		expect(resolveBatchLookupStrategy({ original_message_id: null } as never, 'batch-1')).toEqual({
			kind: 'batch-id',
			batchId: 'batch-1',
		});
	});

	it('returns missing when neither lookup key exists', () => {
		expect(resolveBatchLookupStrategy({ original_message_id: null } as never, undefined)).toEqual({
			kind: 'missing',
		});
	});
});

describe('buildBatchItemEndToEndMap', () => {
	it('indexes batch items by end-to-end id', () => {
		const map = buildBatchItemEndToEndMap(items as never);
		expect(map.get('e2e-1')?.id).toBe('item-1');
	});
});

describe('planTransactionStatusUpdates', () => {
	it('plans accepted updates and mandate promotion', () => {
		const map = buildBatchItemEndToEndMap(items as never);
		expect(
			planTransactionStatusUpdates([{ end_to_end_id: 'e2e-1', status: 'accepted', reason_code: null }], map),
		).toEqual({
			updates: [{ itemId: 'item-1', status: 'accepted', reasonCode: null }],
			acceptedCount: 1,
			rejectedCount: 0,
			unknownEndToEndIds: [],
			mandatesToPromote: new Set(['mandate-1']),
		});
	});

	it('tracks unknown end-to-end ids', () => {
		const map = buildBatchItemEndToEndMap(items as never);
		expect(
			planTransactionStatusUpdates([{ end_to_end_id: 'missing', status: 'accepted', reason_code: null }], map),
		).toEqual({
			updates: [],
			acceptedCount: 0,
			rejectedCount: 0,
			unknownEndToEndIds: ['missing'],
			mandatesToPromote: new Set(),
		});
	});
});

describe('shouldCloseBatchAfterImport', () => {
	it('returns true when no open items remain on submitted batch', () => {
		expect(shouldCloseBatchAfterImport(0, 'submitted')).toBe(true);
	});

	it('returns false when open items remain', () => {
		expect(shouldCloseBatchAfterImport(2, 'submitted')).toBe(false);
	});
});

describe('buildBatchItemStatusUpdatePayload', () => {
	it('builds item status update payload', () => {
		expect(buildBatchItemStatusUpdatePayload('accepted', 'AC01', '2026-01-01T00:00:00.000Z')).toEqual({
			status: 'accepted',
			reason_code: 'AC01',
			status_updated_at: '2026-01-01T00:00:00.000Z',
		});
	});
});

describe('buildMandatePromotionUpdatePayload', () => {
	it('builds mandate promotion payload', () => {
		expect(buildMandatePromotionUpdatePayload('2026-01-01T00:00:00.000Z')).toEqual({
			sequence_type: 'RCUR',
			first_used_at: '2026-01-01T00:00:00.000Z',
			status: 'active',
		});
	});
});

describe('buildBatchCloseUpdatePayload', () => {
	it('builds batch close payload', () => {
		expect(buildBatchCloseUpdatePayload('2026-01-01T00:00:00.000Z')).toEqual({
			status: 'closed',
			closed_at: '2026-01-01T00:00:00.000Z',
		});
	});
});

describe('resolveBatchNotFoundError', () => {
	it('returns message id lookup error', () => {
		expect(resolveBatchNotFoundError({ kind: 'message-id', messageId: 'msg-1' })).toBe(
			'Geen batch gevonden voor MsgId=msg-1',
		);
	});

	it('returns batch id lookup error', () => {
		expect(resolveBatchNotFoundError({ kind: 'batch-id', batchId: 'batch-1' })).toEqual(
			'Geen batch gevonden voor MsgId=batch-1',
		);
	});
});

describe('resolveMissingBatchLookupError', () => {
	it('returns missing lookup error message', () => {
		expect(resolveMissingBatchLookupError()).toBe(
			'Kon batch niet bepalen: geen OrgnlMsgId in XML en geen batch_id meegegeven',
		);
	});
});

describe('resolveBatchLookupColumn', () => {
	it('returns message_id for message lookup', () => {
		expect(resolveBatchLookupColumn({ kind: 'message-id', messageId: 'msg-1' })).toBe('message_id');
	});

	it('returns id for batch lookup', () => {
		expect(resolveBatchLookupColumn({ kind: 'batch-id', batchId: 'batch-1' })).toBe('id');
	});
});

describe('resolveBatchLookupValue', () => {
	it('returns message id value', () => {
		expect(resolveBatchLookupValue({ kind: 'message-id', messageId: 'msg-1' })).toBe('msg-1');
	});

	it('returns batch id value', () => {
		expect(resolveBatchLookupValue({ kind: 'batch-id', batchId: 'batch-1' })).toBe('batch-1');
	});
});
