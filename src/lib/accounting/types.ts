export type PaymentProvider = 'stripe' | 'sepa';

export interface AccountingSettings {
	id: boolean;
	journal_code_memoriaal: string;
	journal_code_bank: string;
	account_debiteuren: string;
	account_omzet_under_21: string;
	account_omzet_21_plus: string;
	account_btw_21: string;
	account_bank_stripe: string;
	account_bank_sepa: string;
	btw_code_21: string;
	btw_code_exempt: string;
	currency: string;
	school_year_start_month: number;
	description_template: string;
	payment_provider: PaymentProvider;
	sepa_creditor_name: string | null;
	sepa_creditor_iban: string | null;
	sepa_creditor_bic: string | null;
	sepa_creditor_id: string | null;
	sepa_collection_day: number;
	sepa_remittance_template: string;
	sepa_mandate_prefix: string;
	sepa_mandate_next_seq: number;
	company_name: string | null;
	company_address: string | null;
	company_postcode: string | null;
	company_city: string | null;
	company_kvk: string | null;
	company_btw_nummer: string | null;
	company_iban: string | null;
	company_email: string | null;
	company_phone: string | null;
	company_logo_url: string | null;
	invoice_number_prefix: string;
	invoice_number_next: number;
	invoice_payment_term_days: number;
	invoice_footer_text: string | null;
}

export type AgeCategory = 'under_21' | '21_plus' | 'unknown' | 'mixed';

export interface AccountingInvoice {
	invoice_id: string;
	/** Set when the report row is one invoice line. */
	line_id?: string;
	/** Exempt excl. VAT. Set on mixed invoices so both revenue accounts can be posted. */
	amount_excl_under_21_cents?: number;
	/** Taxable excl. VAT. Set on mixed invoices so both revenue accounts can be posted. */
	amount_excl_21_plus_cents?: number;
	stripe_invoice_id: string;
	status: string;
	amount_due_cents: number;
	amount_paid_cents: number;
	amount_excl_btw_cents: number;
	btw_amount_cents: number;
	currency: string;
	period_start: string;
	paid_at: string | null;
	hosted_invoice_url: string | null;
	age_category: AgeCategory;
	cost_center: string;
	lesson_type_id: string | null;
	lesson_type_name: string | null;
	lesson_type_icon: string | null;
	lesson_type_color: string | null;
	student_user_id: string;
	student_name: string;
}

export interface AccountingSummary {
	invoice_count: number;
	total_revenue_under_21_cents: number;
	total_revenue_unknown_age_cents: number;
	total_revenue_21_plus_excl_cents: number;
	total_vat_cents: number;
	total_receivables_cents: number;
	total_paid_cents: number;
	total_open_cents: number;
}

export interface AccountingCostCenter {
	cost_center: string;
	invoice_count: number;
	revenue_under_21_cents: number;
	revenue_unknown_age_cents: number;
	revenue_21_plus_excl_cents: number;
	vat_cents: number;
	total_receivables_cents: number;
}

export interface AccountingReport {
	period: { start: string; end: string };
	summary: AccountingSummary;
	invoices: AccountingInvoice[];
	by_cost_center: AccountingCostCenter[];
}

export function formatCentsEUR(cents: number): string {
	return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function centsToAmount(cents: number): string {
	return (cents / 100).toFixed(2);
}
