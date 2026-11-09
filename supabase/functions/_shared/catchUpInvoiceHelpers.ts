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

export function buildCatchUpInvoiceIdempotencyKey(agreementId: string, fromMonth: string, toMonth: string): string {
	return `mcp_catchup_invoice_${agreementId}_${fromMonth}_${toMonth}`;
}

export function buildCatchUpLineIdempotencyKey(
	agreementId: string,
	fromMonth: string,
	toMonth: string,
	month: string,
): string {
	return `${buildCatchUpInvoiceIdempotencyKey(agreementId, fromMonth, toMonth)}_item_${month}`;
}

function formatMonthDisplay(month: string): string {
	return `${month.slice(5, 7)}-${month.slice(0, 4)}`;
}

export function catchUpLineDescription(month: string): string {
	return `Lesgeld ${formatMonthDisplay(month)}`;
}

export function catchUpInvoiceDescription(fromMonth: string, toMonth: string): string {
	return `Lesgeld ${formatMonthDisplay(fromMonth)} t/m ${formatMonthDisplay(toMonth)} (inhaalfactuur)`;
}
