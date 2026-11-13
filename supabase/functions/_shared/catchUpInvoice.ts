/** Stripe IO for catch-up invoices. Pure math lives in catchUpInvoiceHelpers.ts. */

import type Stripe from 'npm:stripe@17.5.0';
import {
	buildCatchUpFinalizeIdempotencyKey,
	buildCatchUpInvoiceIdempotencyKey,
	buildCatchUpInvoicePlan,
	buildCatchUpLineIdempotencyKey,
	buildCatchUpProductIdempotencyKey,
	buildCatchUpProductRecoveryIdempotencyKey,
	buildCatchUpProductSearchQuery,
	type CatchUpInvoicePlan,
	catchUpDraftNeedsLineItems,
	catchUpIdempotencyRetryDelayMs,
	catchUpInvoiceDescription,
	catchUpLineDescription,
	isStripeResourceMissingError,
	isUsableStripeProduct,
	needsCatchUpPaymentMethodUpdate,
	pickActiveGlobalCatchUpProductId,
	pickAdoptableLegacyCatchUpProductId,
	pickReusableCatchUpInvoice,
	resolveExistingCatchUpSettleKind,
	STRIPE_CATCH_UP_PRODUCT_NAME,
	STRIPE_CATCH_UP_PRODUCT_SCOPE,
	stripeExpandableId,
} from './catchUpInvoiceHelpers.ts';

const CATCH_UP_IDEMPOTENCY_RETRY_ATTEMPTS = 4;
const CATCH_UP_IDEMPOTENCY_RETRY_DELAY_MS = 250;

function catchUpProductCreateParams(): Stripe.ProductCreateParams {
	return {
		name: STRIPE_CATCH_UP_PRODUCT_NAME,
		metadata: { kind: 'catch_up', scope: STRIPE_CATCH_UP_PRODUCT_SCOPE },
	};
}

async function renameCatchUpProductIfNeeded(
	stripe: Stripe,
	productId: string,
	currentName: string | null,
): Promise<void> {
	if (currentName === STRIPE_CATCH_UP_PRODUCT_NAME) return;
	await stripe.products.update(productId, { name: STRIPE_CATCH_UP_PRODUCT_NAME });
}

/** Confirm a Product id from search still exists (search can lag after catalog wipes). */
export async function retrieveUsableStripeProductId(stripe: Stripe, productId: string): Promise<string | null> {
	try {
		const product = await stripe.products.retrieve(productId);
		return isUsableStripeProduct(product) ? product.id : null;
	} catch (e) {
		if (isStripeResourceMissingError(e)) return null;
		throw e;
	}
}

async function adoptLegacyCatchUpProduct(stripe: Stripe, productId: string): Promise<string | null> {
	const usableId = await retrieveUsableStripeProductId(stripe, productId);
	if (!usableId) return null;
	await stripe.products.update(usableId, {
		name: STRIPE_CATCH_UP_PRODUCT_NAME,
		metadata: { kind: 'catch_up', scope: STRIPE_CATCH_UP_PRODUCT_SCOPE },
	});
	return usableId;
}

async function keepExistingGlobalCatchUpProduct(
	stripe: Stripe,
	products: Array<{ id: string; name?: string | null }>,
	productId: string,
): Promise<string | null> {
	const usableId = await retrieveUsableStripeProductId(stripe, productId);
	if (!usableId) return null;
	const existing = products.find((product) => product.id === usableId);
	await renameCatchUpProductIfNeeded(stripe, usableId, existing?.name ?? null);
	return usableId;
}

async function tryGlobalCatchUpProduct(stripe: Stripe): Promise<string | null> {
	const found = await stripe.products.search({
		query: buildCatchUpProductSearchQuery(),
		limit: 10,
	});
	const existingId = pickActiveGlobalCatchUpProductId(found.data);
	if (!existingId) return null;
	return keepExistingGlobalCatchUpProduct(stripe, found.data, existingId);
}

async function tryLegacyCatchUpProduct(stripe: Stripe): Promise<string | null> {
	const legacy = await stripe.products.search({
		query: `metadata['kind']:'catch_up'`,
		limit: 20,
	});
	const adoptableId = pickAdoptableLegacyCatchUpProductId(legacy.data);
	if (!adoptableId) return null;
	return adoptLegacyCatchUpProduct(stripe, adoptableId);
}

async function createCatchUpProduct(stripe: Stripe): Promise<string> {
	const params = catchUpProductCreateParams();
	const created = await stripe.products.create(params, {
		idempotencyKey: buildCatchUpProductIdempotencyKey(),
	});
	const usableId = await retrieveUsableStripeProductId(stripe, created.id);
	if (usableId) return usableId;

	const recovered = await stripe.products.create(params, {
		idempotencyKey: buildCatchUpProductRecoveryIdempotencyKey(crypto.randomUUID()),
	});
	return recovered.id;
}

/** Shared catch-up Product; creates one when the catalog has none (empty env / wipe). */
async function ensureCatchUpProduct(stripe: Stripe): Promise<string> {
	const fromGlobal = await tryGlobalCatchUpProduct(stripe);
	if (fromGlobal) return fromGlobal;
	const fromLegacy = await tryLegacyCatchUpProduct(stripe);
	if (fromLegacy) return fromLegacy;
	return createCatchUpProduct(stripe);
}

async function sleepCatchUpRetry(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry when checkout.session.completed and setup_intent.succeeded race the same key. */
async function withCatchUpIdempotencyRetry<T>(operation: () => Promise<T>): Promise<T> {
	for (let attempt = 1; ; attempt += 1) {
		try {
			return await operation();
		} catch (e) {
			const delayMs = catchUpIdempotencyRetryDelayMs(
				e,
				attempt,
				CATCH_UP_IDEMPOTENCY_RETRY_ATTEMPTS,
				CATCH_UP_IDEMPOTENCY_RETRY_DELAY_MS,
			);
			if (delayMs == null) throw e;
			await sleepCatchUpRetry(delayMs);
		}
	}
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
		await withCatchUpIdempotencyRetry(() =>
			stripe.invoiceItems.create(
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
			),
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
	const finalized = await withCatchUpIdempotencyRetry(() =>
		stripe.invoices.finalizeInvoice(
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
		),
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
	defaultPaymentMethod?: string;
};

async function fillEmptyDraftCatchUpLines(
	stripe: Stripe,
	invoice: Stripe.Invoice,
	input: ExistingCatchUpSettleInput,
): Promise<void> {
	if ((invoice.lines?.data?.length ?? 0) > 0) return;
	const productId = await ensureCatchUpProduct(stripe);
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
		attemptId: string;
	},
): Promise<string> {
	const { plan, lessonAgreementId, customerId, attemptId } = input;
	const productId = await ensureCatchUpProduct(stripe);
	const metadata = {
		lesson_agreement_id: lessonAgreementId,
		kind: 'catch_up',
		month: plan.fromMonth,
		to_month: plan.toMonth,
	};

	const created = await withCatchUpIdempotencyRetry(() =>
		stripe.invoices.create(
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
		),
	);

	// Create idempotency returns the cached draft body; retrieve for live status/lines on retries/races.
	const invoice = await stripe.invoices.retrieve(created.id, { expand: ['lines'] });
	if (invoice.status !== 'draft') {
		return invoice.id;
	}

	if (catchUpDraftNeedsLineItems(invoice)) {
		await addCatchUpLineItems(stripe, {
			customerId,
			invoiceId: invoice.id,
			productId,
			lessonAgreementId,
			attemptId,
			plan,
			metadata,
		});
	}

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
			defaultPaymentMethod: input.defaultPaymentMethod,
		});
	}

	return createAndFinalizeCatchUpInvoice(stripe, input);
}

export function planCatchUpInvoice(input: {
	startDate: string;
	today: string;
	monthlyCents: number;
	periodStart: string;
	periodEnd: string;
}): CatchUpInvoicePlan | null {
	return buildCatchUpInvoicePlan(input);
}
