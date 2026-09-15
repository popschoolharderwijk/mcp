import { buildPaymentInfoBlocks, groupItemsBySequenceType } from './buildSepaXmlPure.ts';
import type { BatchRow, ItemRow, SepaXmlContext } from './types.ts';
import { fmtAmount, xmlEscape } from './xmlPure.ts';

export function buildSepaXml(
	settings: SepaXmlContext['settings'],
	batch: BatchRow,
	items: ItemRow[],
): { xml: string; msgId: string } {
	const groups = groupItemsBySequenceType(items);
	const msgId = batch.message_id ?? `MSG-${batch.batch_number}-${Date.now()}`;
	const creationDateTime = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
	const totalCents = items.reduce((sum, it) => sum + it.amount_cents, 0);
	const nbOfTxs = items.length;

	const creditorName = xmlEscape(settings.sepa_creditor_name);
	const creditorIban = settings.sepa_creditor_iban.replace(/\s/g, '');
	const creditorBic = settings.sepa_creditor_bic ? xmlEscape(settings.sepa_creditor_bic) : null;
	const creditorId = xmlEscape(settings.sepa_creditor_id);

	const pmtInfBlocks = buildPaymentInfoBlocks(groups, {
		msgId,
		creditorName,
		creditorIban,
		creditorBic,
		creditorId,
		collectionDate: batch.collection_date,
	});

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${xmlEscape(msgId)}</MsgId>
      <CreDtTm>${creationDateTime}</CreDtTm>
      <NbOfTxs>${nbOfTxs}</NbOfTxs>
      <CtrlSum>${fmtAmount(totalCents)}</CtrlSum>
      <InitgPty><Nm>${creditorName}</Nm></InitgPty>
    </GrpHdr>${pmtInfBlocks}
  </CstmrDrctDbtInitn>
</Document>`;

	return { xml, msgId };
}
