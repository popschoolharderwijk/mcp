export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled';
export type InvoiceAgeCategory = 'under_21' | '21_plus' | 'unknown' | 'mixed';

export interface Invoice {
	id: string;
	invoice_number: string;
	student_user_id: string;
	batch_id: string | null;
	issue_date: string;
	due_date: string;
	period_start: string | null;
	period_end: string | null;
	amount_excl_vat_cents: number;
	vat_amount_cents: number;
	amount_total_cents: number;
	age_category: InvoiceAgeCategory;
	status: InvoiceStatus;
	pdf_storage_path: string | null;
	sent_at: string | null;
	paid_at: string | null;
	email_sent_to: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
	draft: 'Concept',
	issued: 'Verstuurd',
	paid: 'Betaald',
	cancelled: 'Geannuleerd',
};

export function formatCentsEUR(cents: number): string {
	return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
