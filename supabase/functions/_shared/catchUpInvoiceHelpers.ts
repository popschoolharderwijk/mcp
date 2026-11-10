/**
 * Catch-up invoice math: when the mandate arrives after the agreement start month,
 * missed billing months (through the current calendar month) go on one separate invoice.
 * Non-billing months (August under Sep–Jul school year) are omitted — no €0 lines.
 * No Deno/Stripe/Supabase imports (Bun-testable).
 */

import { type BillingPhase, getSchoolYearForDateString, type SchoolYearBounds } from './billingHelpers.ts';
import { needsCatchUpInvoice } from './paymentLinkHelpers.ts';

export interface CatchUpLineItem {
	month: string;
	amountCents: number;
}

export interface CatchUpInvoicePlan {
	lines: CatchUpLineItem[];
	fromMonth: string;
	toMonth: string;
	amountCents: number;
}

function pad(n: number): string {
	return n.toString().padStart(2, '0');
}

function monthLabel(year: number, month: number): string {
	return `${year}-${pad(month)}`;
}

function isNonBillingMonth(year: number, month: number, bounds?: SchoolYearBounds): boolean {
	const probe = `${year}-${pad(month)}-15`;
	const window = getSchoolYearForDateString(probe, bounds);
	return probe < window.start || probe > window.end;
}

/** Billing months YYYY-MM from periodStart through periodEnd (exclusive of non-billing). */
export function listBillingMonthLabels(periodStart: string, periodEnd: string, bounds?: SchoolYearBounds): string[] {
	const start = new Date(`${periodStart}T00:00:00Z`);
	const end = new Date(`${periodEnd}T00:00:00Z`);
	let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
	const labels: string[] = [];
	while (cursor <= end) {
		const year = cursor.getUTCFullYear();
		const month = cursor.getUTCMonth() + 1;
		if (!isNonBillingMonth(year, month, bounds)) {
			labels.push(monthLabel(year, month));
		}
		cursor = new Date(Date.UTC(year, month, 1));
	}
	return labels;
}

function amountForBillingMonth(
	month: string,
	monthlyCents: number,
	leftoverCents: number,
	leftoverMonth: string | undefined,
): number {
	return monthlyCents + (month === leftoverMonth ? leftoverCents : 0);
}

/**
 * Line items for one catch-up invoice: billing months from the agreement start month
 * through the current calendar month. Empty when catch-up is not needed or no billable months.
 * Leftover cents follow buildPhases: added only on the last billing month of [periodStart, periodEnd].
 */
export function buildCatchUpLineItems(input: {
	startDate: string;
	today: string;
	monthlyCents: number;
	leftoverCents: number;
	periodStart: string;
	periodEnd: string;
	schoolYearBounds?: SchoolYearBounds;
}): CatchUpLineItem[] {
	if (!needsCatchUpInvoice(input.startDate, input.today)) return [];

	const allMonths = listBillingMonthLabels(input.periodStart, input.periodEnd, input.schoolYearBounds);
	const leftoverMonth = allMonths[allMonths.length - 1];
	const from = input.startDate.slice(0, 7);
	const to = input.today.slice(0, 7);

	return allMonths
		.filter((month) => month >= from && month <= to)
		.map((month) => ({
			month,
			amountCents: amountForBillingMonth(month, input.monthlyCents, input.leftoverCents, leftoverMonth),
		}));
}

export function buildCatchUpInvoicePlan(input: {
	startDate: string;
	today: string;
	monthlyCents: number;
	leftoverCents: number;
	periodStart: string;
	periodEnd: string;
	schoolYearBounds?: SchoolYearBounds;
}): CatchUpInvoicePlan | null {
	const lines = buildCatchUpLineItems(input);
	const amountCents = lines.reduce((sum, line) => sum + line.amountCents, 0);
	if (lines.length === 0 || amountCents <= 0) return null;
	return {
		lines,
		fromMonth: lines[0].month,
		toMonth: lines[lines.length - 1].month,
		amountCents,
	};
}

/** Keep schedule phases that start after the catch-up coverage month (YYYY-MM). */
export function filterPhasesAfterCatchUpMonth(phases: BillingPhase[], catchUpThroughMonth: string): BillingPhase[] {
	return phases.filter((phase) => phase.label > catchUpThroughMonth);
}

/** Single global catch-up Product for all agreements. */
export const STRIPE_CATCH_UP_PRODUCT_NAME = 'Inhalen lesgeld';
export const STRIPE_CATCH_UP_PRODUCT_SCOPE = 'global';

export function buildCatchUpProductIdempotencyKey(): string {
	return 'mcp_catchup_product_global';
}

/** Prefer the shared catalog product; ignore legacy per-agreement catch-up products. */
export function buildCatchUpProductSearchQuery(): string {
	return `metadata['kind']:'catch_up' AND metadata['scope']:'${STRIPE_CATCH_UP_PRODUCT_SCOPE}'`;
}

export type CatchUpProductCandidate = {
	id: string;
	active?: boolean | null;
	name?: string | null;
	metadata?: Record<string, string> | null;
};

/** Active global catch-up product, or null when search only returned legacy/inactive rows. */
export function pickActiveGlobalCatchUpProductId(products: CatchUpProductCandidate[]): string | null {
	for (const product of products) {
		if (product.active === false) continue;
		if (product.metadata?.kind !== 'catch_up') continue;
		if (product.metadata?.scope !== STRIPE_CATCH_UP_PRODUCT_SCOPE) continue;
		return product.id;
	}
	return null;
}

/**
 * Shared catch-up product created before scope=global existed: active, kind=catch_up,
 * and not pinned to one lesson agreement.
 */
export function pickAdoptableLegacyCatchUpProductId(products: CatchUpProductCandidate[]): string | null {
	for (const product of products) {
		if (product.active === false) continue;
		if (product.metadata?.kind !== 'catch_up') continue;
		if (product.metadata?.lesson_agreement_id) continue;
		return product.id;
	}
	return null;
}

/** Draft catch-up invoices need line items before finalize; non-draft means another attempt finished. */
export function catchUpDraftNeedsLineItems(invoice: {
	status?: string | null;
	lines?: { data?: readonly unknown[] | null } | null;
}): boolean {
	return invoice.status === 'draft' && (invoice.lines?.data?.length ?? 0) === 0;
}

/** Includes attemptId so same-attempt retries share the key; new attempts create only when none are reusable. */
export function buildCatchUpInvoiceIdempotencyKey(
	agreementId: string,
	fromMonth: string,
	toMonth: string,
	attemptId: string,
): string {
	return `mcp_catchup_invoice_${agreementId}_${fromMonth}_${toMonth}_${attemptId}`;
}

export function buildCatchUpFinalizeIdempotencyKey(
	agreementId: string,
	fromMonth: string,
	toMonth: string,
	attemptId: string,
): string {
	return `${buildCatchUpInvoiceIdempotencyKey(agreementId, fromMonth, toMonth, attemptId)}_finalize`;
}

export function buildCatchUpLineIdempotencyKey(
	agreementId: string,
	fromMonth: string,
	toMonth: string,
	month: string,
	attemptId: string,
): string {
	return `${buildCatchUpInvoiceIdempotencyKey(agreementId, fromMonth, toMonth, attemptId)}_item_${month}`;
}

export type CatchUpInvoiceLike = {
	id: string;
	status?: string | null;
	metadata?: { kind?: string | null; lesson_agreement_id?: string | null } | null;
};

function isReusableCatchUpInvoiceStatus(status: string | null | undefined): boolean {
	return status === 'draft' || status === 'open' || status === 'paid';
}

/** Prefer an existing draft/open/paid catch-up so rematch never charges twice. Newest-first lists. */
export function pickReusableCatchUpInvoice<T extends CatchUpInvoiceLike>(
	invoices: T[],
	lessonAgreementId: string,
): T | null {
	for (const invoice of invoices) {
		if (
			invoice.metadata?.kind === 'catch_up' &&
			invoice.metadata?.lesson_agreement_id === lessonAgreementId &&
			isReusableCatchUpInvoiceStatus(invoice.status)
		) {
			return invoice;
		}
	}
	return null;
}

/** Stripe expandable id field (string or object). */
export function stripeExpandableId(value: string | { id: string } | null | undefined): string | null {
	if (!value) return null;
	if (typeof value === 'string') return value;
	return value.id;
}

export function needsCatchUpPaymentMethodUpdate(
	currentPaymentMethodId: string | null,
	nextPaymentMethodId: string | undefined,
): boolean {
	return Boolean(nextPaymentMethodId) && currentPaymentMethodId !== nextPaymentMethodId;
}

export type ExistingCatchUpSettleKind = 'done' | 'pay_open' | 'finalize_draft';

/** How to settle a reusable catch-up already on the customer. */
export function resolveExistingCatchUpSettleKind(status: string | null | undefined): ExistingCatchUpSettleKind {
	if (status === 'open') return 'pay_open';
	if (status === 'draft') return 'finalize_draft';
	return 'done';
}

function formatMonthDisplay(month: string): string {
	return `${month.slice(5, 7)}-${month.slice(0, 4)}`;
}

/** Dutch Stripe invoice copy (identifiers stay English). */
const STRIPE_TUITION_LINE_PREFIX = 'Lesgeld';
const STRIPE_CATCH_UP_INVOICE_SUFFIX = '(inhaalfactuur)';

export function catchUpLineDescription(month: string): string {
	return `${STRIPE_TUITION_LINE_PREFIX} ${formatMonthDisplay(month)}`;
}

export function catchUpInvoiceDescription(fromMonth: string, toMonth: string): string {
	return `${STRIPE_TUITION_LINE_PREFIX} ${formatMonthDisplay(fromMonth)} t/m ${formatMonthDisplay(toMonth)} ${STRIPE_CATCH_UP_INVOICE_SUFFIX}`;
}
