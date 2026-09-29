export interface Body {
	batch_id: string;
	send_email?: boolean;
}

export interface BatchItem {
	id: string;
	student_user_id: string;
	amount_cents: number;
	remittance_info: string;
	lesson_agreement_id: string | null;
	mandate_id: string;
}

export interface StudentInfo {
	user_id: string;
	first_name: string | null;
	last_name: string | null;
	email: string;
	date_of_birth: string | null;
	parent_email: string | null;
	parent_name: string | null;
	debtor_name: string | null;
	debtor_address: string | null;
	debtor_postal_code: string | null;
	debtor_city: string | null;
	debtor_info_same_as_student: boolean;
}

export interface InvoiceLine {
	batch_item_id: string;
	description: string;
	lesson_date: string | null;
	quantity: number;
	unit_price_cents: number;
	btw_rate: number;
	amount_excl_btw_cents: number;
	btw_amount_cents: number;
	amount_total_cents: number;
}

export interface InvoiceTotals {
	excl: number;
	btw21: number;
	btw0: number;
	total: number;
}

export interface StudentInvoiceResult {
	student_user_id: string;
	invoice_id?: string;
	invoice_number?: string;
	skipped?: boolean;
	error?: string;
}

export interface ProfileRow {
	user_id: string;
	first_name: string | null;
	last_name: string | null;
	email: string;
}

export interface StudentRow {
	user_id: string;
	date_of_birth: string | null;
	parent_email: string | null;
	parent_name: string | null;
	debtor_info_same_as_student: boolean;
	debtor_name: string | null;
	debtor_address: string | null;
	debtor_postal_code: string | null;
	debtor_city: string | null;
}

export interface AccountingSettings extends Record<string, unknown> {
	invoice_payment_term_days?: number;
	company_name?: string;
}

export interface DirectDebitBatch {
	collection_date: string;
}
