import type { Tables } from '@/integrations/supabase/types';
import { INVOICE_STATUS_LABELS, type Invoice } from '@/lib/invoices/types';

export interface MyInvoiceRow {
	id: string;
	invoice_number: string;
	issue_date: string;
	due_date: string | null;
	status_label: string;
	amount_total_cents: number;
	currency: string;
	source: 'Mplifi' | 'Stripe';
	hosted_url: string | null;
	pdf_url: string | null;
	invoice: Invoice | null;
}

const STRIPE_INVOICE_STATUS_LABELS: Record<string, string> = {
	draft: 'Concept',
	open: 'Openstaand',
	paid: 'Betaald',
	void: 'Geannuleerd',
	uncollectible: 'Oninbaar',
};

/** Only HTTPS invoice links supplied by Stripe are opened in the portal. */
export function safeStripeInvoiceUrl(value: string | null): string | null {
	if (!value) return null;
	try {
		const url = new URL(value);
		return url.protocol === 'https:' && (url.hostname === 'stripe.com' || url.hostname.endsWith('.stripe.com'))
			? url.href
			: null;
	} catch {
		return null;
	}
}

export function mergeMyInvoices(own: Invoice[], stripe: Tables<'subscription_invoices'>[]): MyInvoiceRow[] {
	return [
		...own.map((invoice): MyInvoiceRow => ({
			id: `mplifi:${invoice.id}`,
			invoice_number: invoice.invoice_number,
			issue_date: invoice.issue_date,
			due_date: invoice.due_date,
			status_label: INVOICE_STATUS_LABELS[invoice.status],
			amount_total_cents: invoice.amount_total_cents,
			currency: 'EUR',
			source: 'Mplifi',
			hosted_url: null,
			pdf_url: null,
			invoice,
		})),
		...stripe.map((invoice): MyInvoiceRow => ({
			id: `stripe:${invoice.id}`,
			invoice_number: invoice.stripe_invoice_id,
			issue_date: invoice.created_at.slice(0, 10),
			due_date: null,
			status_label: STRIPE_INVOICE_STATUS_LABELS[invoice.status] ?? 'Onbekend',
			amount_total_cents: invoice.amount_due,
			currency: invoice.currency.toUpperCase(),
			source: 'Stripe',
			hosted_url: safeStripeInvoiceUrl(invoice.hosted_invoice_url),
			pdf_url: safeStripeInvoiceUrl(invoice.invoice_pdf),
			invoice: null,
		})),
	].sort((a, b) => b.issue_date.localeCompare(a.issue_date));
}

export function formatMyInvoiceAmount(invoice: Pick<MyInvoiceRow, 'amount_total_cents' | 'currency'>): string {
	return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: invoice.currency }).format(
		invoice.amount_total_cents / 100,
	);
}