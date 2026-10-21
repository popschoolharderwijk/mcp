/**
 * Catch-up invoice: when the mandate arrives after the agreement started, all missed months
 * (start month through the current month) go on ONE separate invoice, one line per month.
 * Amounts come from agreement_fee_months (single SQL source); August stays a €0 line.
 */
import { addMonths, type FeeMonth, monthStart, type TaxRateIds, taxRateFor } from './subscriptionPlanPure.ts';

export interface CatchUpLine {
	month: string;
	amountCents: number;
	taxRateId: string;
	isProrated: boolean;
}

export interface CatchUpSplit {
	lines: CatchUpLine[];
	fromMonth: string;
	toMonth: string;
	amountCents: number;
	rest: FeeMonth[];
}

/** True when the agreement started in an earlier calendar month than today. */
export function needsCatchUp(startDate: string, today: string): boolean {
	return monthStart(startDate) < monthStart(today);
}

/** Month from which fee months must be loaded for the schedule build. */
export function resolvePlanFromMonth(input: {
	startDate: string;
	today: string;
	running: boolean;
	catchUp: boolean;
}): string {
	if (input.running) return addMonths(monthStart(input.today), 1);
	if (input.catchUp) return monthStart(input.startDate);
	return monthStart(input.today > input.startDate ? input.today : input.startDate);
}

/** Split months (ascending, starting at the start month) into catch-up lines and the rest. */
export function splitCatchUpMonths(months: FeeMonth[], today: string, taxRates: TaxRateIds): CatchUpSplit | null {
	const current = monthStart(today);
	const sorted = [...months].sort((a, b) => a.month.localeCompare(b.month));
	const missed = sorted.filter((m) => m.month <= current);
	if (missed.length === 0) return null;
	const lines = missed.map((m) => ({
		month: m.month,
		amountCents: m.amount_cents,
		taxRateId: taxRateFor(m.age_category, taxRates),
		isProrated: m.is_prorated,
	}));
	const amountCents = lines.reduce((sum, l) => sum + l.amountCents, 0);
	if (amountCents <= 0) return null;
	return {
		lines,
		fromMonth: lines[0].month,
		toMonth: lines[lines.length - 1].month,
		amountCents,
		rest: sorted.filter((m) => m.month > current),
	};
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

function formatMonth(month: string): string {
	return `${month.slice(5, 7)}-${month.slice(0, 4)}`;
}

export function catchUpLineDescription(line: CatchUpLine): string {
	return `Lesgeld ${formatMonth(line.month)}${line.isProrated ? ' (naar rato)' : ''}`;
}

export function catchUpInvoiceDescription(fromMonth: string, toMonth: string): string {
	return `Lesgeld ${formatMonth(fromMonth)} t/m ${formatMonth(toMonth)} (inhaalfactuur)`;
}
