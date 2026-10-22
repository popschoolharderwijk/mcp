import type { ParsedReport, TxResult } from './types.ts';

export function asArray<T>(v: T | T[] | undefined | null): T[] {
	if (v === undefined || v === null) return [];
	return Array.isArray(v) ? v : [v];
}

export function mapTxSts(code: string): TxResult['status'] {
	const upper = code.toUpperCase();
	if (upper === 'RJCT') return 'rejected';
	if (['ACSC', 'ACCC', 'ACSP', 'ACCP', 'ACWC'].includes(upper)) return 'accepted';
	return 'submitted';
}

export function extractReason(tx: Record<string, unknown>): string | null {
	const sri = tx.StsRsnInf as Record<string, unknown> | undefined;
	if (!sri) return null;
	const rsn = sri.Rsn as Record<string, unknown> | undefined;
	if (!rsn) return null;
	const cd = (rsn.Cd ?? rsn.Prtry) as string | undefined;
	return cd ?? null;
}

export function buildParsedReportFromDoc(doc: Record<string, unknown>): ParsedReport {
	const root = (doc.Document ?? doc) as Record<string, unknown>;
	const cstmrPmtStsRpt = root.CstmrPmtStsRpt as Record<string, unknown> | undefined;
	if (!cstmrPmtStsRpt) {
		throw new Error('Geen CstmrPmtStsRpt gevonden — is dit een pain.002-bestand?');
	}

	const grpHdr = cstmrPmtStsRpt.GrpHdr as Record<string, unknown> | undefined;
	const message_id = (grpHdr?.MsgId as string | undefined) ?? null;

	const orgnlGrpInfAndSts = cstmrPmtStsRpt.OrgnlGrpInfAndSts as Record<string, unknown> | undefined;
	const original_message_id = (orgnlGrpInfAndSts?.OrgnlMsgId as string | undefined) ?? null;
	const group_status = (orgnlGrpInfAndSts?.GrpSts as string | undefined) ?? null;

	const transactions: TxResult[] = [];
	const paymentInfos = asArray(cstmrPmtStsRpt.OrgnlPmtInfAndSts as unknown);

	for (const pmt of paymentInfos) {
		const pmtRec = pmt as Record<string, unknown>;
		const txs = asArray(pmtRec.TxInfAndSts as unknown);
		for (const tx of txs) {
			const txRec = tx as Record<string, unknown>;
			const eteId = txRec.OrgnlEndToEndId as string | undefined;
			const sts = txRec.TxSts as string | undefined;
			if (!eteId || !sts) continue;
			transactions.push({
				end_to_end_id: eteId,
				status: mapTxSts(sts),
				reason_code: extractReason(txRec),
			});
		}
	}

	return { message_id, original_message_id, group_status, transactions };
}
