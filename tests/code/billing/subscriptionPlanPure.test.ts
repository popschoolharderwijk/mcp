import { describe, expect, it } from 'bun:test';
import { buildLookupKey } from '../../../supabase/functions/_shared/stripeCatalogPure';
import {
	addMonths,
	buildSubscriptionPlan,
	compareUpcomingAmount,
	type FeeMonth,
	horizonMonthCount,
	MAX_SCHEDULE_PHASES,
	needsHorizonExtension,
	ONE_OFF_NOT_SUPPORTED,
	type PlanInput,
} from '../../../supabase/functions/_shared/subscriptionPlanPure';

const OPT = 'opt-1';
const TAX = { nl_21_incl: 'txr_21', exempt: 'txr_0' };
const U21 = 7338;
const ADULT = 8879;

function key(from: string, cat: 'under_21' | 'adult', amount: number) {
	return buildLookupKey(OPT, from, cat, amount);
}

const PRICES: Record<string, string> = {
	[key('2026-09-01', 'under_21', U21)]: 'price_u21',
	[key('2026-09-01', 'adult', ADULT)]: 'price_adult',
	[key('2027-09-01', 'under_21', 7500)]: 'price_u21_2027',
};

/** Fee months like agreement_fee_months returns them (August = 0). */
function months(
	from: string,
	count: number,
	fee: (month: string, i: number) => Partial<FeeMonth> = () => ({}),
): FeeMonth[] {
	return Array.from({ length: count }, (_, i) => {
		const month = addMonths(from, i);
		const aug = month.slice(5, 7) === '08';
		return {
			month,
			amount_cents: aug ? 0 : U21,
			age_category: aug ? null : 'under_21',
			is_prorated: false,
			tariff_effective_from: aug ? null : '2026-09-01',
			...(aug ? {} : fee(month, i)),
		} as FeeMonth;
	});
}

function input(overrides: Partial<PlanInput>): PlanInput {
	return {
		optionId: OPT,
		billingKind: 'monthly',
		today: '2026-10-01',
		startDate: '2026-10-01',
		months: months('2026-10-01', 12),
		priceIdByLookupKey: PRICES,
		taxRates: TAX,
		...overrides,
	};
}

function ok(plan: ReturnType<typeof buildSubscriptionPlan>) {
	if (!plan.ok) throw new Error(plan.error);
	return plan;
}

describe('buildSubscriptionPlan', () => {
	it('instroom 15 oktober: deelfactuur op de startdatum, schedule vanaf 1 november', () => {
		const prorated = Math.round((U21 * 17) / 31);
		const plan = ok(
			buildSubscriptionPlan(
				input({
					today: '2026-10-10',
					startDate: '2026-10-15',
					months: months('2026-10-01', 12, (_m, i) =>
						i === 0 ? { amount_cents: prorated, is_prorated: true } : {},
					),
				}),
			),
		);
		expect(plan.firstInvoice).toEqual({
			month: '2026-10-01',
			dueOn: '2026-10-15',
			amountCents: prorated,
			taxRateId: 'txr_0',
			isProrated: true,
		});
		expect(plan.phases[0]).toMatchObject({ start: '2026-11-01', priceId: 'price_u21', trial: false });
	});

	it('start op de 1e: geen deelfactuur', () => {
		const plan = ok(buildSubscriptionPlan(input({})));
		expect(plan.firstInvoice).toBeNull();
		expect(plan.phases[0].start).toBe('2026-10-01');
	});

	it('augustus is elk jaar een trial-fase van € 0', () => {
		const plan = ok(buildSubscriptionPlan(input({ months: months('2026-10-01', 24) })));
		const trials = plan.phases.filter((p) => p.trial);
		expect(trials.map((p) => [p.start, p.end, p.amountCents])).toEqual([
			['2027-08-01', '2027-09-01', 0],
			['2028-08-01', '2028-09-01', 0],
		]);
		expect(plan.phases.map((p) => p.start)).toEqual([
			'2026-10-01',
			'2027-08-01',
			'2027-09-01',
			'2028-08-01',
			'2028-09-01',
		]);
		expect(plan.endBehavior).toBe('release');
	});

	it('21e verjaardag 10 maart: 21+-prijs en 21%-btw vanaf 1 april', () => {
		const plan = ok(
			buildSubscriptionPlan(
				input({
					months: months('2026-10-01', 10, (m) =>
						m >= '2027-04-01' ? { amount_cents: ADULT, age_category: '21_plus' } : {},
					),
				}),
			),
		);
		expect(plan.phases.map((p) => [p.start, p.end, p.priceId, p.taxRateId])).toEqual([
			['2026-10-01', '2027-04-01', 'price_u21', 'txr_0'],
			['2027-04-01', '2027-08-01', 'price_adult', 'txr_21'],
		]);
	});

	it('tariefwijziging 1 september: nieuwe fase met de nieuwe prijs', () => {
		const plan = ok(
			buildSubscriptionPlan(
				input({
					months: months('2026-10-01', 13, (m) =>
						m >= '2027-09-01' ? { amount_cents: 7500, tariff_effective_from: '2027-09-01' } : {},
					),
				}),
			),
		);
		expect(plan.phases.at(-1)).toMatchObject({ start: '2027-09-01', priceId: 'price_u21_2027' });
	});

	it('opzegging per 30 april: laatste fase eindigt 1 mei, end_behavior cancel', () => {
		const plan = ok(
			buildSubscriptionPlan(
				input({ months: months('2026-10-01', 12, (m) => (m >= '2027-05-01' ? { amount_cents: 0 } : {})) }),
			),
		);
		expect(plan.phases.at(-1)?.end).toBe('2027-05-01');
		expect(plan.endBehavior).toBe('cancel');
	});

	it('einde per 31 juli: geen augustus-fase, stopt op 1 augustus', () => {
		const plan = ok(
			buildSubscriptionPlan(
				input({ months: months('2026-10-01', 13, (m) => (m >= '2027-09-01' ? { amount_cents: 0 } : {})) }),
			),
		);
		expect(plan.phases.at(-1)?.end).toBe('2027-08-01');
		expect(plan.endBehavior).toBe('cancel');
	});

	it('gelijke maanden worden samengevoegd en nooit meer dan 10 fasen', () => {
		const plan = ok(buildSubscriptionPlan(input({ months: months('2026-10-01', 120) })));
		expect(plan.phases.length).toBeLessThanOrEqual(MAX_SCHEDULE_PHASES);
	});

	it('ontbrekende catalogusprijs geeft een duidelijke fout', () => {
		const plan = buildSubscriptionPlan(input({ months: months('2026-10-01', 3, () => ({ amount_cents: 7400 })) }));
		expect(plan.ok).toBe(false);
		if (!plan.ok) expect(plan.error).toContain('synchroniseer eerst met Stripe');
	});

	it('groepsles krijgt geen abonnement', () => {
		expect(buildSubscriptionPlan(input({ billingKind: 'one_off' }))).toEqual({
			ok: false,
			error: ONE_OFF_NOT_SUPPORTED,
		});
	});

	it('vervolg van een lopend schedule: geen eerste factuur', () => {
		const plan = ok(
			buildSubscriptionPlan(input({ today: '2026-10-20', continuation: true, months: months('2026-11-01', 12) })),
		);
		expect(plan.firstInvoice).toBeNull();
		expect(plan.phases[0].start).toBe('2026-11-01');
	});

	it('lopende maand bij late machtiging: lopende maand als losse factuur', () => {
		const plan = ok(buildSubscriptionPlan(input({ today: '2026-10-20', startDate: '2026-09-01' })));
		expect(plan.firstInvoice).toMatchObject({
			month: '2026-10-01',
			dueOn: '2026-10-20',
			amountCents: U21,
			isProrated: false,
		});
		expect(plan.phases[0].start).toBe('2026-11-01');
	});
});

describe('horizon', () => {
	it('loopt tot en met de eerste augustus minstens 12 maanden vooruit', () => {
		expect(horizonMonthCount('2026-10-01')).toBe(23); // t/m augustus 2028
		expect(horizonMonthCount('2026-08-01')).toBe(13); // t/m augustus 2027
	});
	it('verlengen als de horizon minder dan 12 maanden weg is', () => {
		expect(needsHorizonExtension('2027-09-01', '2026-10-20')).toBe(true);
		expect(needsHorizonExtension('2028-09-01', '2026-10-20')).toBe(false);
		expect(needsHorizonExtension(null, '2026-10-20')).toBe(true);
	});
});

describe('compareUpcomingAmount', () => {
	const row = { lesson_agreement_id: 'a', month: '2026-11-01', expected_cents: U21 };
	it('gelijk', () =>
		expect(compareUpcomingAmount({ ...row, stripe_cents: U21 })).toEqual({ status: 'ok', diff_cents: 0 }));
	it('hoger', () => expect(compareUpcomingAmount({ ...row, stripe_cents: U21 + 5 }).status).toBe('mismatch'));
	it('lager', () => expect(compareUpcomingAmount({ ...row, stripe_cents: U21 - 5 }).diff_cents).toBe(-5));
	it('augustus verwacht € 0', () =>
		expect(compareUpcomingAmount({ ...row, month: '2027-08-01', expected_cents: 0, stripe_cents: 0 }).status).toBe(
			'ok',
		));
	it('nog niet gestart', () =>
		expect(compareUpcomingAmount({ ...row, stripe_cents: null }).status).toBe('not_started'));
});
