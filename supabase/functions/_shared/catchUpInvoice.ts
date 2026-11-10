/** Stripe IO for catch-up invoices. Pure math lives in catchUpInvoiceHelpers.ts. */

import type Stripe from 'npm:stripe@17.5.0';
import {
	buildCatchUpFinalizeIdempotencyKey,
	buildCatchUpInvoiceIdempotencyKey,
	buildCatchUpInvoicePlan,
	buildCatchUpLineIdempotencyKey,
	buildCatchUpProductIdempotencyKey,
	type CatchUpInvoicePlan,
	catchUpInvoiceDescription,
	catchUpLineDescription,
	needsCatchUpPaymentMethodUpdate,
	pickReusableCatchUpInvoice,
	resolveExistingCatchUpSettleKind,
	stripeExpandableId,
} from './catchUpInvoiceHelpers.ts';

async function ensureCatchUpProduct(stripe: Stripe, lessonAgreementId: string, productName: string): Promise<string> {
	const product = await stripe.products.create(
		{
			name: productName,
			metadata: { lesson_agreement_id: lessonAgreementId, kind: 'catch_up' },
		},
		{ idempotencyKey: buildCatchUpProductIdempotencyKey(lessonAgreementId) },
	);
	if (product.name !== productName) {
		await stripe.products.update(product.id, { name: productName });
	}
	return product.id;
}

async function listCustomerInvoices(stripe: Stripe, customerId: string): Promise<Stripe.Invoice[]> {
	const page = await stripe.invoices.list({ customer: customerId, limit: 100 });
	return page.data;
}

async function attachDefaultPaymentMethodIfNeeded(
	stripe: Stripe,
	invoice: Stripe.Invoice,
	defaultPaymentMethod: string | undefined,
): Promise<void> {
	if (!needsCatchUpPaymentMethodUpdate(stripeExpandableId(invoice.default_payment_method), defaultPaymentMethod)) {
		return;
	}
	await stripe.invoices.update(invoice.id, { default_payment_method: defaultPaymentMethod });
}

async function addCatchUpLineItems(
	stripe: Stripe,
	input: {
		customerId: string;
		invoiceId: string;
		productId: string;
		lessonAgreementId: string;
		attemptId: string;
		plan: CatchUpInvoicePlan;
		metadata: Record<string, string>;
	},
): Promise<void> {
	const { plan, lessonAgreementId, attemptId } = input;
	for (const line of plan.lines) {
		await stripe.invoiceItems.create(
			{
				customer: input.customerId,
				invoice: input.invoiceId,
				description: catchUpLineDescription(line.month),
				price_data: {
					currency: 'eur',
					product: input.productId,
					unit_amount: line.amountCents,
				},
				metadata: { ...input.metadata, line_month: line.month },
			},
			{
				idempotencyKey: buildCatchUpLineIdempotencyKey(
					lessonAgreementId,
					plan.fromMonth,
					plan.toMonth,
					line.month,
					attemptId,
				),
			},
		);
	}
}

async function finalizeCatchUpDraft(
	stripe: Stripe,
	invoiceId: string,
	lessonAgreementId: string,
	plan: CatchUpInvoicePlan,
	attemptId: string,
): Promise<string> {
	const finalized = await stripe.invoices.finalizeInvoice(
		invoiceId,
		{ auto_advance: true },
		{
			idempotencyKey: buildCatchUpFinalizeIdempotencyKey(
				lessonAgreementId,
				plan.fromMonth,
				plan.toMonth,
				attemptId,
			),
		},
	);
	return finalized.id;
}

/** Pay an open catch-up when rematching; leave the invoice in place if collection fails. */
async function settleOpenCatchUpInvoice(
	stripe: Stripe,
	invoice: Stripe.Invoice,
	defaultPaymentMethod: string | undefined,
): Promise<string> {
	await attachDefaultPaymentMethodIfNeeded(stripe, invoice, defaultPaymentMethod);
	try {
		const paid = await stripe.invoices.pay(invoice.id);
		return paid.id;
	} catch (e) {
		console.error('catch-up invoice pay failed; leaving existing invoice in place', invoice.id, e);
		return invoice.id;
	}
}

type ExistingCatchUpSettleInput = {
	invoiceId: string;
	customerId: string;
	lessonAgreementId: string;
	attemptId: string;
	plan: CatchUpInvoicePlan;
	productName: string;
	defaultPaymentMethod?: string;
};

async function fillEmptyDraftCatchUpLines(
	stripe: Stripe,
	invoice: Stripe.Invoice,
	input: ExistingCatchUpSettleInput,
): Promise<void> {
	if ((invoice.lines?.data?.length ?? 0) > 0) return;
	const productId = await ensureCatchUpProduct(stripe, input.lessonAgreementId, input.productName);
	await addCatchUpLineItems(stripe, {
		customerId: input.customerId,
		invoiceId: invoice.id,
		productId,
		lessonAgreementId: input.lessonAgreementId,
		attemptId: input.attemptId,
		plan: input.plan,
		metadata: {
			lesson_agreement_id: input.lessonAgreementId,
			kind: 'catch_up',
			month: input.plan.fromMonth,
			to_month: input.plan.toMonth,
		},
	});
}

async function settleDraftCatchUpInvoice(
	stripe: Stripe,
	invoice: Stripe.Invoice,
	input: ExistingCatchUpSettleInput,
): Promise<string> {
	await attachDefaultPaymentMethodIfNeeded(stripe, invoice, input.defaultPaymentMethod);
	await fillEmptyDraftCatchUpLines(stripe, invoice, input);
	return finalizeCatchUpDraft(stripe, invoice.id, input.lessonAgreementId, input.plan, input.attemptId);
}

async function settleExistingCatchUpInvoice(stripe: Stripe, input: ExistingCatchUpSettleInput): Promise<string> {
	const live = await stripe.invoices.retrieve(input.invoiceId, { expand: ['lines'] });
	const settleKind = resolveExistingCatchUpSettleKind(live.status);
	if (settleKind === 'done') return live.id;
	if (settleKind === 'pay_open') {
		return settleOpenCatchUpInvoice(stripe, live, input.defaultPaymentMethod);
	}
	return settleDraftCatchUpInvoice(stripe, live, input);
}

async function createAndFinalizeCatchUpInvoice(
	stripe: Stripe,
	input: {
		lessonAgreementId: string;
		customerId: string;
		defaultPaymentMethod?: string;
		plan: CatchUpInvoicePlan;
		productName: string;
		attemptId: string;
	},
): Promise<string> {
	const { plan, lessonAgreementId, customerId, productName, attemptId } = input;
	const productId = await ensureCatchUpProduct(stripe, lessonAgreementId, productName);
	const metadata = {
		lesson_agreement_id: lessonAgreementId,
		kind: 'catch_up',
		month: plan.fromMonth,
		to_month: plan.toMonth,
	};

	const created = await stripe.invoices.create(
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
			idempotencyKey: buildCatchUpInvoiceIdempotencyKey(
				lessonAgreementId,
				plan.fromMonth,
				plan.toMonth,
				attemptId,
			),
		},
	);

	// Create idempotency returns the cached draft body; retrieve for live status on retries/races.
	const invoice = await stripe.invoices.retrieve(created.id);
	if (invoice.status !== 'draft') {
		return invoice.id;
	}

	await addCatchUpLineItems(stripe, {
		customerId,
		invoiceId: invoice.id,
		productId,
		lessonAgreementId,
		attemptId,
		plan,
		metadata,
	});

	return finalizeCatchUpDraft(stripe, invoice.id, lessonAgreementId, plan, attemptId);
}

/**
 * Create or reuse the one catch-up invoice for an agreement.
 * Rematch after cancel must not open a second charge: draft/open/paid catch-ups are settled in place.
 */
export async function issueCatchUpInvoice(
	stripe: Stripe,
	input: {
		lessonAgreementId: string;
		customerId: string;
		defaultPaymentMethod?: string;
		plan: CatchUpInvoicePlan;
		productName: string;
		attemptId: string;
	},
): Promise<string> {
	const existing = pickReusableCatchUpInvoice(
		await listCustomerInvoices(stripe, input.customerId),
		input.lessonAgreementId,
	);
	if (existing) {
		return settleExistingCatchUpInvoice(stripe, {
			invoiceId: existing.id,
			customerId: input.customerId,
			lessonAgreementId: input.lessonAgreementId,
			attemptId: input.attemptId,
			plan: input.plan,
			productName: input.productName,
			defaultPaymentMethod: input.defaultPaymentMethod,
		});
	}

	return createAndFinalizeCatchUpInvoice(stripe, input);
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
