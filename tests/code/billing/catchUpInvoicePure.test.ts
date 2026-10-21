import { describe, expect, test } from 'bun:test';
import {
	buildCatchUpInvoiceIdempotencyKey,
	buildCatchUpLineIdempotencyKey,
	needsCatchUp,
	resolvePlanFromMonth,
	splitCatchUpMonths,
} from '../../../supabase/functions/_shared/catchUpInvoicePure.ts';
import type { FeeMonth } from '../../../supabase/functions/_shared/subscriptionPlanPure.ts';

const tax = { nl_21_incl: 'txr_21', exempt: 'txr_0' };
const m = (month: string, amount: number, prorated = false, cat: FeeMonth['age_category'] = 'under_21'): FeeMonth => ({
	month,
	amount_cents: amount,
	age_category: cat,
	is_prorated: prorated,
	tariff_effective_from: '2026-09-01',
});

describe('needsCatchUp', () => {
	test('mandate before start → no catch-up', () => {
		expect(needsCatchUp('2026-11-15', '2026-10-21')).toBe(false);
	});
	test('mandate in the start month → no catch-up (regular first invoice)', () => {
		expect(needsCatchUp('2026-10-01', '2026-10-21')).toBe(false);
	});
	test('mandate in a later month → catch-up', () => {
		expect(needsCatchUp('2026-10-15', '2026-12-03')).toBe(true);
	});
});

describe('resolvePlanFromMonth', () => {
	test('catch-up loads from the start month', () => {
		expect(
			resolvePlanFromMonth({ startDate: '2026-10-15', today: '2026-12-03', running: false, catchUp: true }),
		).toBe('2026-10-01');
	});
	test('running schedule continues next month', () => {
		expect(
			resolvePlanFromMonth({ startDate: '2026-10-15', today: '2026-12-03', running: true, catchUp: false }),
		).toBe('2027-01-01');
	});
});

describe('splitCatchUpMonths', () => {
	test('start mid-October, mandate in December → Oct prorated, Nov, Dec; schedule from January', () => {
		const split = splitCatchUpMonths(
			[m('2026-10-01', 4024, true), m('2026-11-01', 7338), m('2026-12-01', 7338), m('2027-01-01', 7338)],
			'2026-12-03',
			tax,
		);
		expect(split?.lines.map((l) => l.month)).toEqual(['2026-10-01', '2026-11-01', '2026-12-01']);
		expect(split?.lines[0].isProrated).toBe(true);
		expect(split?.amountCents).toBe(4024 + 7338 + 7338);
		expect(split?.toMonth).toBe('2026-12-01');
		expect(split?.rest.map((r) => r.month)).toEqual(['2027-01-01']);
	});
	test('start in July, mandate in September → July, August €0, September', () => {
		const split = splitCatchUpMonths(
			[m('2026-07-01', 7338), m('2026-08-01', 0), m('2026-09-01', 7338), m('2026-10-01', 7338)],
			'2026-09-10',
			tax,
		);
		expect(split?.lines.map((l) => [l.month, l.amountCents])).toEqual([
			['2026-07-01', 7338],
			['2026-08-01', 0],
			['2026-09-01', 7338],
		]);
		expect(split?.amountCents).toBe(14676);
	});
	test('start on the 1st → no prorated line', () => {
		const split = splitCatchUpMonths([m('2026-10-01', 7338), m('2026-11-01', 7338)], '2026-11-05', tax);
		expect(split?.lines.every((l) => !l.isProrated)).toBe(true);
	});
	test('VAT per line follows the age category', () => {
		const split = splitCatchUpMonths(
			[m('2026-10-01', 7338), m('2026-11-01', 8879, false, '21_plus')],
			'2026-11-05',
			tax,
		);
		expect(split?.lines.map((l) => l.taxRateId)).toEqual(['txr_0', 'txr_21']);
	});
});

test('idempotency keys are deterministic', () => {
	expect(buildCatchUpInvoiceIdempotencyKey('a1', '2026-10-01', '2026-12-01')).toBe(
		'mcp_catchup_invoice_a1_2026-10-01_2026-12-01',
	);
	expect(buildCatchUpLineIdempotencyKey('a1', '2026-10-01', '2026-12-01', '2026-11-01')).toBe(
		'mcp_catchup_invoice_a1_2026-10-01_2026-12-01_item_2026-11-01',
	);
});
