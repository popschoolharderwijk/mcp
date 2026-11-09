/** Stripe IO for catch-up invoices. Pure math lives in catchUpInvoiceHelpers.ts. */

import type Stripe from 'npm:stripe@17.5.0';
import {
	buildCatchUpInvoiceIdempotencyKey,
	buildCatchUpInvoicePlan,
	buildCatchUpLineIdempotencyKey,
	type CatchUpInvoicePlan,
	catchUpInvoiceDescription,
	catchUpLineDescription,
} from './catchUpInvoiceHelpers.ts';

async function ensureCatchUpProduct(stripe: Stripe, lessonAgreementId: string): Promise<string> {
	const product = await stripe.products.create({
		name: `Lesgeld inhaal ${lessonAgreementId}`,
		metadata: { lesson_agreement_id: lessonAgreementId, kind: 'catch_up' },
	});
	return product.id;
}

/** Create, fill, and finalize a one-off catch-up invoice (charge_automatically). */
export async function issueCatchUpInvoice(
	stripe: Stripe,
	input: {
		lessonAgreementId: string;
		customerId: string;
		defaultPaymentMethod?: string;
		plan: CatchUpInvoicePlan;
	},
): Promise<string> {
	const { plan, lessonAgreementId, customerId } = input;
	const productId = await ensureCatchUpProduct(stripe, lessonAgreementId);
	const metadata = {
		lesson_agreement_id: lessonAgreementId,
		kind: 'catch_up',
		month: plan.fromMonth,
		to_month: plan.toMonth,
	};

	const invoice = await stripe.invoices.create(
		{
			customer: customerId,
			collection_method: 'charge_automatically',
			auto_advance: false,
			pending_invoice_items_behavior: 'exclude',
			description: catchUpInvoiceDescription(plan.fromMonth, plan.toMonth),
			metadata,
			...(input.defaultPaymentMethod ? { default_payment_method: input.defaultPaymentMethod } : {}),
		},
		{
			idempotencyKey: buildCatchUpInvoiceIdempotencyKey(lessonAgreementId, plan.fromMonth, plan.toMonth),
		},
	);

	for (const line of plan.lines) {
		await stripe.invoiceItems.create(
			{
				customer: customerId,
				invoice: invoice.id,
				description: catchUpLineDescription(line.month),
				price_data: {
					currency: 'eur',
					product: productId,
					unit_amount: line.amountCents,
				},
				metadata: { ...metadata, line_month: line.month },
			},
			{
				idempotencyKey: buildCatchUpLineIdempotencyKey(
					lessonAgreementId,
					plan.fromMonth,
					plan.toMonth,
					line.month,
				),
			},
		);
	}

	const finalized = await stripe.invoices.finalizeInvoice(invoice.id, { auto_advance: true });
	return finalized.id;
}

export function planCatchUpInvoice(input: {
	startDate: string;
	today: string;
	monthlyCents: number;
	leftoverCents: number;
	periodStart: string;
	periodEnd: string;
}): CatchUpInvoicePlan | null {
	return buildCatchUpInvoicePlan(input);
}
