import type { AccountingReport, AccountingSettings } from './types';
import { centsToAmount } from './types';

// ============================================================
// Journal entry generation
// ============================================================
// Per report row, on period_start: accounts receivable against exempt revenue,
// taxable revenue, and VAT. A mixed invoice posts both revenue accounts.
// A paid row also posts the provider bank account against accounts receivable.
// ============================================================

export interface JournalLine {
	entryId: string;
	date: string; // YYYY-MM-DD
	journalCode: string;
	account: string;
	debit: number; // cents
	credit: number; // cents
	description: string;
	btwCode: string | null;
	costCenter: string | null;
	invoiceReference: string;
	studentName: string;
}

function isoDate(value: string): string {
	return value.slice(0, 10);
}

function journalBankAccount(settings: AccountingSettings): string {
	return settings.payment_provider === 'sepa' ? settings.account_bank_sepa : settings.account_bank_stripe;
}

function journalRevenueParts(inv: AccountingReport['invoices'][number]): {
	exempt: number;
	taxable: number;
	vat: number;
} {
	if (inv.age_category === '21_plus') {
		return { exempt: 0, taxable: inv.amount_excl_btw_cents, vat: inv.btw_amount_cents };
	}
	if (inv.age_category === 'mixed') {
		const taxable = inv.amount_excl_21_plus_cents ?? 0;
		const exempt = inv.amount_excl_under_21_cents ?? inv.amount_excl_btw_cents - taxable;
		return { exempt, taxable, vat: inv.btw_amount_cents };
	}
	return { exempt: inv.amount_excl_btw_cents, taxable: 0, vat: 0 };
}

export function generateJournalLines(report: AccountingReport, settings: AccountingSettings): JournalLine[] {
	const lines: JournalLine[] = [];

	for (const inv of report.invoices) {
		const invoiceDate = isoDate(inv.period_start);
		const desc = `Factuur ${inv.stripe_invoice_id} - ${inv.student_name}`;
		const invoiceEntryId = `FACT-${inv.invoice_id}`;

		// 1) Accounts receivable (debit) — gross amount
		lines.push({
			entryId: invoiceEntryId,
			date: invoiceDate,
			journalCode: settings.journal_code_memoriaal,
			account: settings.account_debiteuren,
			debit: inv.amount_due_cents,
			credit: 0,
			description: desc,
			btwCode: null,
			costCenter: inv.cost_center,
			invoiceReference: inv.stripe_invoice_id,
			studentName: inv.student_name,
		});

		const revenue = journalRevenueParts(inv);
		if (revenue.exempt > 0) {
			lines.push({
				entryId: invoiceEntryId,
				date: invoiceDate,
				journalCode: settings.journal_code_memoriaal,
				account: settings.account_omzet_under_21,
				debit: 0,
				credit: revenue.exempt,
				description: desc,
				btwCode: settings.btw_code_exempt,
				costCenter: inv.cost_center,
				invoiceReference: inv.stripe_invoice_id,
				studentName: inv.student_name,
			});
		}
		if (revenue.taxable > 0) {
			lines.push({
				entryId: invoiceEntryId,
				date: invoiceDate,
				journalCode: settings.journal_code_memoriaal,
				account: settings.account_omzet_21_plus,
				debit: 0,
				credit: revenue.taxable,
				description: desc,
				btwCode: settings.btw_code_21,
				costCenter: inv.cost_center,
				invoiceReference: inv.stripe_invoice_id,
				studentName: inv.student_name,
			});
		}
		if (revenue.vat > 0) {
			lines.push({
				entryId: invoiceEntryId,
				date: invoiceDate,
				journalCode: settings.journal_code_memoriaal,
				account: settings.account_btw_21,
				debit: 0,
				credit: revenue.vat,
				description: `BTW ${desc}`,
				btwCode: settings.btw_code_21,
				costCenter: inv.cost_center,
				invoiceReference: inv.stripe_invoice_id,
				studentName: inv.student_name,
			});
		}

		// Bank entry when paid
		if (inv.status === 'paid' && inv.paid_at && inv.amount_paid_cents > 0) {
			const bankDatum = isoDate(inv.paid_at);
			const bankEntryId = `PAY-${inv.invoice_id}`;
			lines.push({
				entryId: bankEntryId,
				date: bankDatum,
				journalCode: settings.journal_code_bank,
				account: journalBankAccount(settings),
				debit: inv.amount_paid_cents,
				credit: 0,
				description: `Betaling ${desc}`,
				btwCode: null,
				costCenter: inv.cost_center,
				invoiceReference: inv.stripe_invoice_id,
				studentName: inv.student_name,
			});
			lines.push({
				entryId: bankEntryId,
				date: bankDatum,
				journalCode: settings.journal_code_bank,
				account: settings.account_debiteuren,
				debit: 0,
				credit: inv.amount_paid_cents,
				description: `Betaling ${desc}`,
				btwCode: null,
				costCenter: inv.cost_center,
				invoiceReference: inv.stripe_invoice_id,
				studentName: inv.student_name,
			});
		}
	}

	return lines;
}

// ============================================================
// CSV export
// ============================================================

function csvEscape(value: string | number | null | undefined): string {
	if (value === null || value === undefined) return '';
	const s = String(value);
	if (/[",;\n\r]/.test(s)) {
		return `"${s.replace(/"/g, '""')}"`;
	}
	return s;
}

export function generateCsv(lines: JournalLine[]): string {
	const header = [
		'Mutatienr',
		'Datum',
		'Dagboek',
		'Grootboek',
		'Debet',
		'Credit',
		'BTW-code',
		'Kostenplaats',
		'Omschrijving',
		'Factuur',
		'Leerling',
	].join(';');
	const rows = lines.map((l) =>
		[
			csvEscape(l.entryId),
			csvEscape(l.date),
			csvEscape(l.journalCode),
			csvEscape(l.account),
			csvEscape(centsToAmount(l.debit)),
			csvEscape(centsToAmount(l.credit)),
			csvEscape(l.btwCode ?? ''),
			csvEscape(l.costCenter ?? ''),
			csvEscape(l.description),
			csvEscape(l.invoiceReference),
			csvEscape(l.studentName),
		].join(';'),
	);
	return `${[header, ...rows].join('\r\n')}\r\n`;
}

// ============================================================
// Exact Online XML export (GLTransactions schema)
// https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-glentryxsd
// ============================================================

function xmlEscape(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

export function generateExactXml(lines: JournalLine[], settings: AccountingSettings): string {
	// Group lines by entryId
	const byEntry = new Map<string, JournalLine[]>();
	for (const l of lines) {
		const arr = byEntry.get(l.entryId) ?? [];
		arr.push(l);
		byEntry.set(l.entryId, arr);
	}

	const transactions: string[] = [];
	for (const [entryId, entryLines] of byEntry) {
		const first = entryLines[0];
		if (!first) continue;
		const journalCode = first.journalCode;
		const date = first.date;
		const txLines = entryLines
			.map((l, idx) => {
				const amount = l.debit > 0 ? l.debit : -l.credit;
				const vatAttr = l.btwCode ? ` vatcode="${xmlEscape(l.btwCode)}"` : '';
				const costCenterEl = l.costCenter ? `\n        <CostCenter code="${xmlEscape(l.costCenter)}" />` : '';
				return `      <GLTransactionLine linetype="0" line="${idx + 1}" status="20">
        <Date>${date}</Date>
        <FinYear number="${new Date(date).getFullYear()}" />
        <FinPeriod number="${new Date(date).getMonth() + 1}" />
        <GLAccount code="${xmlEscape(l.account)}" />
        <Amount>
          <Currency code="${xmlEscape(settings.currency)}" />
          <Value>${centsToAmount(amount)}</Value>
        </Amount>
        <Description>${xmlEscape(l.description)}</Description>
        <YourRef>${xmlEscape(l.invoiceReference)}</YourRef>${costCenterEl}
        <VATType${vatAttr} />
      </GLTransactionLine>`;
			})
			.join('\n');

		transactions.push(`    <GLTransaction entry="${xmlEscape(entryId)}">
      <Journal code="${xmlEscape(journalCode)}" />
      <Date>${date}</Date>
      <FinYear number="${new Date(date).getFullYear()}" />
      <FinPeriod number="${new Date(date).getMonth() + 1}" />
      <Description>${xmlEscape(first.description)}</Description>
${txLines}
    </GLTransaction>`);
	}

	return `<?xml version="1.0" encoding="UTF-8"?>
<eExact xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="eExact-XML.xsd">
  <GLTransactions>
${transactions.join('\n')}
  </GLTransactions>
</eExact>
`;
}
