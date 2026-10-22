import type { ItemRow } from './types.ts';
import { fmtAmount, xmlEscape } from './xmlHelpers.ts';

export function groupItemsBySequenceType(items: ItemRow[]): Map<string, ItemRow[]> {
	const groups = new Map<string, ItemRow[]>();
	for (const item of items) {
		const group = groups.get(item.sequence_type) ?? [];
		group.push(item);
		groups.set(item.sequence_type, group);
	}
	return groups;
}

export function buildTransactionBlock(item: ItemRow, collectionDate: string): string {
	if (!item.sepa_mandates) return '';
	const mandate = item.sepa_mandates;
	const iban = mandate.iban.replace(/\s/g, '');
	return `
        <DrctDbtTxInf>
          <PmtId><EndToEndId>${xmlEscape(item.end_to_end_id)}</EndToEndId></PmtId>
          <InstdAmt Ccy="${xmlEscape(item.currency || 'EUR')}">${fmtAmount(item.amount_cents)}</InstdAmt>
          <DrctDbtTx>
            <MndtRltdInf>
              <MndtId>${xmlEscape(mandate.mandate_reference)}</MndtId>
              <DtOfSgntr>${mandate.signed_at ?? collectionDate}</DtOfSgntr>
            </MndtRltdInf>
          </DrctDbtTx>
          ${mandate.bic ? `<DbtrAgt><FinInstnId><BIC>${xmlEscape(mandate.bic)}</BIC></FinInstnId></DbtrAgt>` : '<DbtrAgt><FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId></DbtrAgt>'}
          <Dbtr><Nm>${xmlEscape(mandate.account_holder)}</Nm></Dbtr>
          <DbtrAcct><Id><IBAN>${xmlEscape(iban)}</IBAN></Id></DbtrAcct>
          <RmtInf><Ustrd>${xmlEscape(item.remittance_info.slice(0, 140))}</Ustrd></RmtInf>
        </DrctDbtTxInf>`;
}

export function buildPaymentInfoBlock(
	seqType: string,
	txCount: number,
	ctrlSum: number,
	pmtInfId: string,
	txBlocks: string,
	args: {
		creditorName: string;
		creditorIban: string;
		creditorBic: string | null;
		creditorId: string;
		collectionDate: string;
	},
): string {
	return `
    <PmtInf>
      <PmtInfId>${xmlEscape(pmtInfId)}</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>${txCount}</NbOfTxs>
      <CtrlSum>${fmtAmount(ctrlSum)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl><Cd>SEPA</Cd></SvcLvl>
        <LclInstrm><Cd>CORE</Cd></LclInstrm>
        <SeqTp>${seqType}</SeqTp>
      </PmtTpInf>
      <ReqdColltnDt>${args.collectionDate}</ReqdColltnDt>
      <Cdtr><Nm>${args.creditorName}</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>${xmlEscape(args.creditorIban)}</IBAN></Id></CdtrAcct>
      ${args.creditorBic ? `<CdtrAgt><FinInstnId><BIC>${args.creditorBic}</BIC></FinInstnId></CdtrAgt>` : '<CdtrAgt><FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId></CdtrAgt>'}
      <ChrgBr>SLEV</ChrgBr>
      <CdtrSchmeId>
        <Id><PrvtId><Othr><Id>${args.creditorId}</Id><SchmeNm><Prtry>SEPA</Prtry></SchmeNm></Othr></PrvtId></Id>
      </CdtrSchmeId>${txBlocks}
    </PmtInf>`;
}

export function buildPaymentInfoBlocks(
	groups: Map<string, ItemRow[]>,
	args: {
		msgId: string;
		creditorName: string;
		creditorIban: string;
		creditorBic: string | null;
		creditorId: string;
		collectionDate: string;
	},
): string {
	let pmtInfBlocks = '';
	let pmtInfIdx = 0;
	for (const [seqType, group] of groups) {
		pmtInfIdx++;
		const pmtInfId = `${args.msgId}-PI${pmtInfIdx}`;
		const ctrlSum = group.reduce((sum, item) => sum + item.amount_cents, 0);
		const txBlocks = group.map((item) => buildTransactionBlock(item, args.collectionDate)).join('');
		pmtInfBlocks += buildPaymentInfoBlock(seqType, group.length, ctrlSum, pmtInfId, txBlocks, args);
	}
	return pmtInfBlocks;
}
