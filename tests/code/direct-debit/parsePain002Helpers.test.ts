import { describe, expect, it } from 'bun:test';
import { buildImportResponse } from '../../../supabase/functions/import-sepa-status/buildImportResponse';
import {
	asArray,
	buildParsedReportFromDoc,
	extractReason,
	mapTxSts,
} from '../../../supabase/functions/import-sepa-status/parsePain002Helpers';

const pain002Doc = {
	Document: {
		CstmrPmtStsRpt: {
			GrpHdr: { MsgId: 'MSG-001' },
			OrgnlGrpInfAndSts: { OrgnlMsgId: 'ORIG-001', GrpSts: 'ACCP' },
			OrgnlPmtInfAndSts: {
				TxInfAndSts: [
					{
						OrgnlEndToEndId: 'E2E-ACCEPT',
						TxSts: 'ACSC',
						StsRsnInf: { Rsn: { Cd: 'AM04' } },
					},
					{
						OrgnlEndToEndId: 'E2E-REJECT',
						TxSts: 'RJCT',
						StsRsnInf: { Rsn: { Prtry: 'MS03' } },
					},
					{
						OrgnlEndToEndId: 'E2E-SUBMIT',
						TxSts: 'PDNG',
					},
				],
			},
		},
	},
};

describe('asArray', () => {
	it('returns an empty array for nullish values', () => {
		expect(asArray(null)).toEqual([]);
		expect(asArray(undefined)).toEqual([]);
	});

	it('wraps a single value in an array', () => {
		expect(asArray('one')).toEqual(['one']);
	});

	it('returns arrays unchanged', () => {
		expect(asArray(['a', 'b'])).toEqual(['a', 'b']);
	});
});

describe('mapTxSts', () => {
	it('maps RJCT to rejected', () => {
		expect(mapTxSts('RJCT')).toBe('rejected');
		expect(mapTxSts('rjct')).toBe('rejected');
	});

	it('maps accepted bank codes to accepted', () => {
		expect(mapTxSts('ACSC')).toBe('accepted');
		expect(mapTxSts('ACCC')).toBe('accepted');
		expect(mapTxSts('ACSP')).toBe('accepted');
		expect(mapTxSts('ACCP')).toBe('accepted');
		expect(mapTxSts('ACWC')).toBe('accepted');
	});

	it('maps other codes to submitted', () => {
		expect(mapTxSts('PDNG')).toBe('submitted');
	});
});

describe('extractReason', () => {
	it('returns Cd when present', () => {
		expect(extractReason({ StsRsnInf: { Rsn: { Cd: 'AM04' } } })).toBe('AM04');
	});

	it('returns Prtry when Cd is absent', () => {
		expect(extractReason({ StsRsnInf: { Rsn: { Prtry: 'MS03' } } })).toBe('MS03');
	});

	it('returns null when reason info is missing', () => {
		expect(extractReason({})).toBeNull();
		expect(extractReason({ StsRsnInf: {} })).toBeNull();
	});
});

describe('buildParsedReportFromDoc', () => {
	it('parses message ids, group status, and transactions', () => {
		expect(buildParsedReportFromDoc(pain002Doc)).toEqual({
			message_id: 'MSG-001',
			original_message_id: 'ORIG-001',
			group_status: 'ACCP',
			transactions: [
				{ end_to_end_id: 'E2E-ACCEPT', status: 'accepted', reason_code: 'AM04' },
				{ end_to_end_id: 'E2E-REJECT', status: 'rejected', reason_code: 'MS03' },
				{ end_to_end_id: 'E2E-SUBMIT', status: 'submitted', reason_code: null },
			],
		});
	});

	it('handles a single transaction object instead of an array', () => {
		const singleTxDoc = {
			CstmrPmtStsRpt: {
				OrgnlPmtInfAndSts: {
					TxInfAndSts: {
						OrgnlEndToEndId: 'E2E-ONE',
						TxSts: 'ACSC',
					},
				},
			},
		};
		expect(buildParsedReportFromDoc(singleTxDoc).transactions).toEqual([
			{ end_to_end_id: 'E2E-ONE', status: 'accepted', reason_code: null },
		]);
	});

	it('throws when CstmrPmtStsRpt is missing', () => {
		expect(() => buildParsedReportFromDoc({ Document: {} })).toThrow(
			'Geen CstmrPmtStsRpt gevonden — is dit een pain.002-bestand?',
		);
	});
});

describe('buildImportResponse', () => {
	it('builds the import summary payload', () => {
		expect(
			buildImportResponse(
				{ id: 'batch-1', message_id: 'ORIG-001', status: 'submitted' },
				{
					message_id: 'MSG-001',
					original_message_id: 'ORIG-001',
					group_status: 'ACCP',
					transactions: [{ end_to_end_id: 'E2E-1', status: 'accepted', reason_code: null }],
				},
				{
					acceptedCount: 1,
					rejectedCount: 0,
					unknown: [],
					mandatesPromoted: 1,
					batchClosed: true,
				},
			),
		).toEqual({
			batch_id: 'batch-1',
			message_id: 'MSG-001',
			original_message_id: 'ORIG-001',
			group_status: 'ACCP',
			processed: 1,
			accepted: 1,
			rejected: 0,
			unknown_end_to_end_ids: [],
			mandates_promoted: 1,
			batch_closed: true,
		});
	});
});
