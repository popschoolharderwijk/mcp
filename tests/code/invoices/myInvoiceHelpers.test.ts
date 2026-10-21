import { describe, expect, it } from 'bun:test';
import type { Tables } from '../../../src/integrations/supabase/types';
import { mergeMyInvoices, safeStripeInvoiceUrl } from '../../../src/lib/invoices/myInvoiceHelpers';
import type { Invoice } from '../../../src/lib/invoices/types';

const own: Invoice = {
	id: 'own-1',
	invoice_number: 'INV-2026-00001',
	student_user_id: 'student-1',
	batch_id: null,
	issue_date: '2026-10-01',
	due_date: '2026-10-15',
	period_start: null,
	period_end: null,
	amount_excl_btw_cents: 3000,
	btw_amount_cents: 0,
	amount_total_cents: 3000,
	age_category: 'under_21',
	status: 'issued',
	pdf_storage_path: 'student-1/invoice.pdf',
	sent_at: null,
	paid_at: null,
	email_sent_to: null,
	notes: null,
	created_at: '2026-10-01T00:00:00Z',
	updated_at: '2026-10-01T00:00:00Z',
};

const stripe: Tables<'subscription_invoices'> = {
	id: 'stripe-1',
	subscription_id: 'subscription-1',
	stripe_invoice_id: 'in_first_month',
	amount_due: 4679,
	amount_paid: 4679,
	currency: 'eur',
	status: 'paid',
	hosted_invoice_url: 'https://invoice.stripe.com/i/test',
	invoice_pdf: 'https://pay.stripe.com/invoice/test/pdf',
	period_start: '2026-10-20T00:00:00Z',
	period_end: '2026-11-01T00:00:00Z',
	paid_at: '2026-10-20T00:00:00Z',
	created_at: '2026-10-20T00:00:00Z',
	updated_at: '2026-10-20T00:00:00Z',
	created_by: null,
	updated_by: null,
};

describe('mergeMyInvoices', () => {
	it('combines school and first-month Stripe invoices newest first without changing amounts', () => {
		const result = mergeMyInvoices([own], [stripe]);
		expect(result.map((row) => row.id)).toEqual(['stripe:stripe-1', 'mplifi:own-1']);
		expect(result[0]?.amount_total_cents).toBe(4679);
		expect(result[0]?.hosted_url).toBe(stripe.hosted_invoice_url);
		expect(result[0]?.pdf_url).toBe(stripe.invoice_pdf);
		expect(result[0]?.due_date).toBeNull();
		expect(result[1]?.invoice).toEqual(own);
	});

	it('retains zero-euro August invoices and missing links', () => {
		const result = mergeMyInvoices(
			[],
			[{ ...stripe, amount_due: 0, amount_paid: 0, hosted_invoice_url: null, invoice_pdf: null }],
		);
		expect(result).toHaveLength(1);
		expect(result[0]?.amount_total_cents).toBe(0);
		expect(result[0]?.hosted_url).toBeNull();
		expect(result[0]?.pdf_url).toBeNull();
	});

	it('uses the invoice total rather than partially paid amount', () => {
		expect(mergeMyInvoices([], [{ ...stripe, amount_paid: 1000, status: 'open' }])[0]?.amount_total_cents).toBe(
			4679,
		);
	});
});

describe('safeStripeInvoiceUrl', () => {
	it('accepts HTTPS Stripe invoice links only', () => {
		expect(safeStripeInvoiceUrl('https://invoice.stripe.com/i/test')).toBe('https://invoice.stripe.com/i/test');
		for (const url of [
			null,
			'javascript:alert(1)',
			'http://invoice.stripe.com/i/test',
			'https://stripe.com.evil.test/i',
			'not a url',
		]) {
			expect(safeStripeInvoiceUrl(url)).toBeNull();
		}
	});
});
