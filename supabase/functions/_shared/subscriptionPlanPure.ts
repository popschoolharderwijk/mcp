/**
 * Pure planning of a catalog-based Stripe subscription schedule for one lesson agreement.
 * Amounts come only from compute_agreement_month_fee (via agreement_fee_months); this module
 * maps each month onto a catalog price (fase 2 lookup keys) and merges months into phases.
 */
import { buildLookupKey } from './stripeCatalogPure.ts';

export const MAX_SCHEDULE_PHASES = 10;
export const ONE_OFF_NOT_SUPPORTED = 'Groepslessen worden eenmalig betaald; eenmalig betalen via Stripe volgt later';

export interface FeeMonth {
	month: string; // YYYY-MM-01
	amount_cents: number;
	age_category: 'under_21' | '21_plus' | null;
	is_prorated: boolean;
	tariff_effective_from: string | null;
}

export interface TaxRateIds {
	nl_21_incl: string;
	exempt: string;
}

export interface PlannedPhase {
	start: string; // YYYY-MM-01 (inclusive)
	end: string; // YYYY-MM-01 (exclusive)
	trial: boolean; // August: €0, nothing collected
	priceId: string;
	taxRateId: string;
	lookupKey: string;
	amountCents: number;
}

export interface FirstInvoice {
	month: string;
	dueOn: string; // YYYY-MM-DD
	amountCents: number;
	taxRateId: string;
	isProrated: boolean;
}

export type SubscriptionPlan =
	| {
			ok: true;
			firstInvoice: FirstInvoice | null;
			phases: PlannedPhase[];
			endBehavior: 'cancel' | 'release';
			horizonEnd: string | null;
	  }
	| { ok: false; error: string };

export interface PlanInput {
	optionId: string;
	billingKind: 'monthly' | 'one_off';
	today: string; // YYYY-MM-DD
	startDate: string; // agreement start
	months: FeeMonth[]; // consecutive, ascending, first = month of max(today, startDate)
	priceIdByLookupKey: Record<string, string>;
	taxRates: TaxRateIds;
	/** Rebuild of a running schedule: months start next month, no first invoice. */
	continuation?: boolean;
}

export function monthStart(date: string): string {
	return `${date.slice(0, 7)}-01`;
}

export function addMonths(month: string, n: number): string {
	const [y, m] = month.split('-').map(Number);
	const total = y * 12 + (m - 1) + n;
	return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-01`;
}

export function isAugust(month: string): boolean {
	return month.slice(5, 7) === '08';
}

export function monthStartUnix(month: string): number {
	return Math.floor(Date.parse(`${month}T00:00:00Z`) / 1000);
}

/** Months to plan from `fromMonth`: through the first August at least 12 months ahead. */
export function horizonMonthCount(fromMonth: string): number {
	let month = addMonths(fromMonth, 12);
	let count = 13;
	while (!isAugust(month)) {
		month = addMonths(month, 1);
		count += 1;
	}
	return count;
}

export function taxRateFor(category: FeeMonth['age_category'], taxRates: TaxRateIds): string {
	return category === '21_plus' ? taxRates.nl_21_incl : taxRates.exempt;
}

function formatMonth(month: string): string {
	return `${month.slice(5, 7)}-${month.slice(0, 4)}`;
}

function resolveCharge(input: PlanInput, m: FeeMonth): { lookupKey: string; priceId: string } | { error: string } {
	if (!m.age_category || !m.tariff_effective_from) return { error: `Geen tarief bekend voor ${formatMonth(m.month)}` };
	const lookupKey = buildLookupKey(
		input.optionId,
		m.tariff_effective_from,
		m.age_category === '21_plus' ? 'adult' : 'under_21',
		m.amount_cents,
	);
	const priceId = input.priceIdByLookupKey[lookupKey];
	if (!priceId) {
		return {
			error: `Catalogusprijs ontbreekt voor ${formatMonth(m.month)} (€ ${(m.amount_cents / 100).toFixed(2)}): synchroniseer eerst met Stripe`,
		};
	}
	return { lookupKey, priceId };
}

function splitFirstInvoice(input: PlanInput, months: FeeMonth[]): { first: FirstInvoice | null; rest: FeeMonth[] } {
	const m0 = months[0];
	if (input.continuation || !m0 || m0.amount_cents <= 0) return { first: null, rest: months };
	const started = m0.month < input.today;
	if (!m0.is_prorated && !started) return { first: null, rest: months };
	const dueOn = input.startDate > input.today ? input.startDate : input.today;
	return {
		first: {
			month: m0.month,
			dueOn,
			amountCents: m0.amount_cents,
			taxRateId: taxRateFor(m0.age_category, input.taxRates),
			isProrated: m0.is_prorated,
		},
		rest: months.slice(1),
	};
}

type Segment = { start: string; end: string; trial: boolean; charge?: { lookupKey: string; priceId: string; taxRateId: string; amountCents: number } };

function buildSegments(input: PlanInput, months: FeeMonth[]): { segments: Segment[]; ended: boolean } | { error: string } {
	const segments: Segment[] = [];
	for (const m of months) {
		const end = addMonths(m.month, 1);
		if (m.amount_cents <= 0) {
			if (!isAugust(m.month)) return { segments, ended: true };
			segments.push({ start: m.month, end, trial: true });
			continue;
		}
		if (m.is_prorated) return { error: `Onverwachte deelmaand ${formatMonth(m.month)}` };
		const charge = resolveCharge(input, m);
		if ('error' in charge) return charge;
		const last = segments.at(-1);
		if (last && !last.trial && last.charge?.lookupKey === charge.lookupKey && last.end === m.month) {
			last.end = end;
		} else {
			segments.push({
				start: m.month,
				end,
				trial: false,
				charge: { ...charge, taxRateId: taxRateFor(m.age_category, input.taxRates), amountCents: m.amount_cents },
			});
		}
	}
	return { segments, ended: false };
}

/** August phases reuse the neighbouring charge price (trial = nothing collected). */
function fillTrialPrices(segments: Segment[], ended: boolean): PlannedPhase[] {
	const trimmed = [...segments];
	while (ended && trimmed.at(-1)?.trial) trimmed.pop();
	const phases: PlannedPhase[] = [];
	for (let i = 0; i < trimmed.length; i += 1) {
		const seg = trimmed[i];
		const ref =
			seg.charge ??
			trimmed
				.slice(0, i)
				.reverse()
				.find((s) => s.charge)?.charge ??
			trimmed.slice(i + 1).find((s) => s.charge)?.charge;
		if (!ref) continue;
		phases.push({
			start: seg.start,
			end: seg.end,
			trial: seg.trial,
			priceId: ref.priceId,
			taxRateId: ref.taxRateId,
			lookupKey: ref.lookupKey,
			amountCents: seg.trial ? 0 : ref.amountCents,
		});
	}
	return phases;
}

export function buildSubscriptionPlan(input: PlanInput): SubscriptionPlan {
	if (input.billingKind === 'one_off') return { ok: false, error: ONE_OFF_NOT_SUPPORTED };
	const months = [...input.months].sort((a, b) => a.month.localeCompare(b.month));
	if (months.length === 0) return { ok: false, error: 'Geen maanden om te plannen' };

	const { first, rest } = splitFirstInvoice(input, months);
	const built = buildSegments(input, rest);
	if ('error' in built) return { ok: false, error: built.error };

	let phases = fillTrialPrices(built.segments, built.ended);
	let endBehavior: 'cancel' | 'release' = built.ended ? 'cancel' : 'release';
	if (phases.length > MAX_SCHEDULE_PHASES) {
		phases = phases.slice(0, MAX_SCHEDULE_PHASES);
		endBehavior = 'release';
	}
	return {
		ok: true,
		firstInvoice: first,
		phases,
		endBehavior,
		horizonEnd: phases.at(-1)?.end ?? null,
	};
}

/** Rebuild needed when the horizon is less than 12 months away. */
export function needsHorizonExtension(horizonEnd: string | null, today: string): boolean {
	if (!horizonEnd) return true;
	return horizonEnd <= addMonths(monthStart(today), 12);
}

export interface SubscriptionCheckRow {
	lesson_agreement_id: string;
	month: string;
	expected_cents: number;
	stripe_cents: number | null;
}

export type SubscriptionCheckStatus = 'ok' | 'mismatch' | 'not_started';

/** Compare Stripe's next invoice with the fee from the single source. */
export function compareUpcomingAmount(row: SubscriptionCheckRow): { status: SubscriptionCheckStatus; diff_cents: number } {
	if (row.stripe_cents === null) return { status: 'not_started', diff_cents: 0 };
	const diff = row.stripe_cents - row.expected_cents;
	return { status: diff === 0 ? 'ok' : 'mismatch', diff_cents: diff };
}

export function firstInvoiceDescription(first: FirstInvoice): string {
	return `Lesgeld ${formatMonth(first.month)}${first.isProrated ? ' (naar rato)' : ''}`;
}
