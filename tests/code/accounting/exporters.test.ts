/**
 * Unit tests for accounting journal-line generation.
 */
import { describe, expect, it } from 'bun:test';
import { generateCsv, generateExactXml, generateJournalLines } from '../../../src/lib/accounting/exporters';
import type { AccountingReport, AccountingSettings } from '../../../src/lib/accounting/types';

const SETTINGS: AccountingSettings = {
	id: true,
	journal_code_memoriaal: '90',
	journal_code_bank: '20',
	account_debiteuren: '1300',
	account_omzet_under_21: '8000',
	account_omzet_21_plus: '8010',
	account_btw_21: '1500',
	account_bank_stripe: '1100',
	btw_code_21: 'VH',
	btw_code_exempt: '0',
	currency: 'EUR',
	school_year_start_month: 8,
	description_template: 'x',
	account_bank_sepa: '1102',
	payment_provider: 'stripe',
	sepa_creditor_name: null,
	sepa_creditor_iban: null,
	sepa_creditor_bic: null,
	sepa_creditor_id: null,
	sepa_collection_day: 27,
	sepa_remittance_template: 'Lesgeld {month} {year} - {student_name}',
	sepa_mandate_prefix: 'MND',
	sepa_mandate_next_seq: 1,
	company_name: null,
	company_address: null,
	company_postcode: null,
	company_city: null,
	company_kvk: null,
	company_btw_nummer: null,
	company_iban: null,
	company_email: null,
	company_phone: null,
	company_logo_url: null,
	invoice_number_prefix: 'INV-',
	invoice_number_next: 1,
	invoice_payment_term_days: 14,
	invoice_footer_text: null,
};

function makeReport(overrides: Partial<AccountingReport['invoices'][number]> = {}): AccountingReport {
	return {
		period: { start: '2026-06-01', end: '2026-06-30' },
		summary: {
			invoice_count: 1,
			total_revenue_under_21_cents: 0,
			total_revenue_unknown_age_cents: 0,
			total_revenue_21_plus_excl_cents: 0,
			total_vat_cents: 0,
			total_receivables_cents: 0,
			total_paid_cents: 0,
			total_open_cents: 0,
		},
		by_cost_center: [],
		invoices: [
			{
				invoice_id: 'inv-1',
				stripe_invoice_id: 'in_test_1',
				status: 'paid',
				amount_due_cents: 12100,
				amount_paid_cents: 12100,
				amount_excl_btw_cents: 10000,
				btw_amount_cents: 2100,
				currency: 'eur',
				period_start: '2026-06-01T00:00:00Z',
				paid_at: '2026-06-03T10:00:00Z',
				hosted_invoice_url: null,
				age_category: '21_plus',
				cost_center: 'Piano',
				lesson_type_id: 'lt-1',
				lesson_type_name: 'Piano',
				lesson_type_icon: null,
				lesson_type_color: null,
				student_user_id: 'usr-1',
				student_name: 'Jan Jansen',
				...overrides,
			},
		],
	};
}

describe('generateJournalLines', () => {
	it('generates 5 lines for a paid 21+ invoice (AR, revenue, VAT, bank, AR credit)', () => {
		const lines = generateJournalLines(makeReport(), SETTINGS);
		expect(lines.length).toBe(5);
		const invoiceLines = lines.filter((l) => l.entryId === 'FACT-inv-1');
		expect(invoiceLines.length).toBe(3);
		const sumDeb = invoiceLines.reduce((s, l) => s + l.debit, 0);
		const sumCred = invoiceLines.reduce((s, l) => s + l.credit, 0);
		expect(sumDeb).toBe(sumCred);
		expect(sumDeb).toBe(12100);
	});

	it('generates lines for an unpaid under-21 invoice (AR + exempt revenue)', () => {
		const lines = generateJournalLines(
			makeReport({
				status: 'open',
				paid_at: null,
				amount_paid_cents: 0,
				age_category: 'under_21',
				amount_excl_btw_cents: 5000,
				btw_amount_cents: 0,
				amount_due_cents: 5000,
			}),
			SETTINGS,
		);
		expect(lines.length).toBe(2);
		const sumDeb = lines.reduce((s, l) => s + l.debit, 0);
		const sumCred = lines.reduce((s, l) => s + l.credit, 0);
		expect(sumDeb).toBe(sumCred);
		const revenue = lines.find((l) => l.account === '8000');
		expect(revenue?.credit).toBe(5000);
	});

	it('uses the exempt revenue account for unknown age', () => {
		const lines = generateJournalLines(
			makeReport({
				age_category: 'unknown',
				amount_excl_btw_cents: 7500,
				btw_amount_cents: 0,
				amount_due_cents: 7500,
				status: 'open',
				paid_at: null,
				amount_paid_cents: 0,
			}),
			SETTINGS,
		);
		expect(lines.find((l) => l.account === '8000')?.credit).toBe(7500);
		expect(lines.find((l) => l.account === '8010')).toBeUndefined();
	});

	it('omits VAT line when the 21+ invoice has zero VAT', () => {
		const lines = generateJournalLines(
			makeReport({
				age_category: '21_plus',
				amount_excl_btw_cents: 10000,
				btw_amount_cents: 0,
				amount_due_cents: 10000,
				status: 'open',
				paid_at: null,
				amount_paid_cents: 0,
			}),
			SETTINGS,
		);
		expect(lines.filter((l) => l.account === SETTINGS.account_btw_21)).toHaveLength(0);
		expect(lines).toHaveLength(2);
	});

	it('posts both revenue accounts and VAT for a mixed invoice', () => {
		const lines = generateJournalLines(
			makeReport({
				age_category: 'mixed',
				status: 'open',
				paid_at: null,
				amount_paid_cents: 0,
				amount_due_cents: 16100,
				amount_excl_btw_cents: 14000,
				amount_excl_under_21_cents: 4000,
				amount_excl_21_plus_cents: 10000,
				btw_amount_cents: 2100,
			}),
			SETTINGS,
		);
		expect(lines.find((l) => l.account === '8000')?.credit).toBe(4000);
		expect(lines.find((l) => l.account === '8010')?.credit).toBe(10000);
		expect(lines.find((l) => l.account === '1500')?.credit).toBe(2100);
		const sumDeb = lines.reduce((s, l) => s + l.debit, 0);
		const sumCred = lines.reduce((s, l) => s + l.credit, 0);
		expect(sumDeb).toBe(16100);
		expect(sumCred).toBe(16100);
	});

	it('posts a paid invoice to the SEPA bank account when the provider is sepa', () => {
		const lines = generateJournalLines(makeReport(), { ...SETTINGS, payment_provider: 'sepa' });
		const bankDebit = lines.find((l) => l.entryId === 'PAY-inv-1' && l.debit > 0);
		expect(bankDebit?.account).toBe('1102');
		expect(bankDebit?.debit).toBe(12100);
	});

	it('does not create bank lines for paid invoices with zero amount paid', () => {
		const lines = generateJournalLines(
			makeReport({
				status: 'paid',
				paid_at: '2026-06-03T10:00:00Z',
				amount_paid_cents: 0,
			}),
			SETTINGS,
		);
		expect(lines.filter((l) => l.entryId.startsWith('PAY-'))).toHaveLength(0);
		expect(lines).toHaveLength(3);
	});

	it('generates separate journal entries for multiple invoices', () => {
		const firstInvoice = makeReport().invoices[0];
		const secondInvoice = makeReport({
			invoice_id: 'inv-2',
			stripe_invoice_id: 'in_test_2',
			student_name: 'Piet Pietersen',
		}).invoices[0];
		expect(firstInvoice).toBeDefined();
		expect(secondInvoice).toBeDefined();
		const report: AccountingReport = {
			...makeReport(),
			invoices: [firstInvoice, secondInvoice],
		};
		const lines = generateJournalLines(report, SETTINGS);
		expect(lines.filter((l) => l.entryId === 'FACT-inv-1')).toHaveLength(3);
		expect(lines.filter((l) => l.entryId === 'FACT-inv-2')).toHaveLength(3);
	});
});

describe('generateCsv', () => {
	it('includes header and the correct delimiter', () => {
		const csv = generateCsv(generateJournalLines(makeReport(), SETTINGS));
		expect(csv.startsWith('Mutatienr;Datum;Dagboek;')).toBe(true);
		expect(csv).toContain('1300');
		expect(csv).toContain('Jan Jansen');
	});

	it('escapes fields with special characters', () => {
		const lines = generateJournalLines(makeReport({ student_name: 'Naam; met;komma' }), SETTINGS);
		const csv = generateCsv(lines);
		expect(csv).toContain('"Naam; met;komma"');
	});

	it('renders empty cells for missing cost center values', () => {
		const lines = generateJournalLines(
			makeReport({
				cost_center: '',
			}),
			SETTINGS,
		);
		const csv = generateCsv(lines);
		const dataRow = csv.split('\r\n')[1] ?? '';
		expect(dataRow.startsWith('FACT-inv-1;2026-06-01;90;1300;')).toBe(true);
		expect(dataRow.includes('Piano')).toBe(false);
	});
});

describe('generateExactXml', () => {
	it('includes a GLTransaction per entry with the correct journal codes', () => {
		const lines = generateJournalLines(makeReport(), SETTINGS);
		const xml = generateExactXml(lines, SETTINGS);
		expect(xml).toContain('<eExact');
		expect(xml).toContain('entry="FACT-inv-1"');
		expect(xml).toContain('entry="PAY-inv-1"');
		expect(xml).toContain('code="90"');
		expect(xml).toContain('code="20"');
		expect(xml).toContain('vatcode="VH"');
	});

	it('escapes XML entities in descriptions', () => {
		const lines = generateJournalLines(makeReport({ student_name: 'A & B' }), SETTINGS);
		const xml = generateExactXml(lines, SETTINGS);
		expect(xml).toContain('A &amp; B');
	});

	it('includes cost center elements when present', () => {
		const lines = generateJournalLines(makeReport({ cost_center: 'Piano' }), SETTINGS);
		const xml = generateExactXml(lines, SETTINGS);
		expect(xml).toContain('<CostCenter code="Piano" />');
	});
});
