import { describe, expect, it } from 'bun:test';
import { buildPhases } from '../../../supabase/functions/_shared/billingHelpers';
import {
	buildCatchUpInvoiceIdempotencyKey,
	buildCatchUpInvoicePlan,
	buildCatchUpLineIdempotencyKey,
	buildCatchUpLineItems,
	catchUpInvoiceDescription,
	catchUpLineDescription,
	filterPhasesAfterCatchUpMonth,
	listBillingMonthLabels,
} from '../../../supabase/functions/_shared/catchUpInvoiceHelpers';

describe('listBillingMonthLabels', () => {
	it('lists eleven school-year months and skips August', () => {
		expect(listBillingMonthLabels('2026-09-01', '2027-07-31')).toEqual([
			'2026-09',
			'2026-10',
			'2026-11',
			'2026-12',
			'2027-01',
			'2027-02',
			'2027-03',
			'2027-04',
			'2027-05',
			'2027-06',
			'2027-07',
		]);
	});
});

describe('buildCatchUpLineItems', () => {
	it('returns no lines when mandate is in the start month', () => {
		expect(
			buildCatchUpLineItems({
				startDate: '2026-10-01',
				today: '2026-10-20',
				monthlyCents: 7000,
				leftoverCents: 50,
				periodStart: '2026-10-01',
				periodEnd: '2027-07-31',
			}),
		).toEqual([]);
	});

	it('returns no lines when mandate is before the start month', () => {
		expect(
			buildCatchUpLineItems({
				startDate: '2026-11-15',
				today: '2026-10-21',
				monthlyCents: 7000,
				leftoverCents: 0,
				periodStart: '2026-11-15',
				periodEnd: '2027-07-31',
			}),
		).toEqual([]);
	});

	it('builds one line per missed billing month through the current month', () => {
		expect(
			buildCatchUpLineItems({
				startDate: '2026-10-15',
				today: '2026-12-03',
				monthlyCents: 7338,
				leftoverCents: 40,
				periodStart: '2026-10-15',
				periodEnd: '2027-07-31',
			}),
		).toEqual([
			{ month: '2026-10', amountCents: 7338 },
			{ month: '2026-11', amountCents: 7338 },
			{ month: '2026-12', amountCents: 7338 },
		]);
	});

	it('skips August and does not emit a zero line', () => {
		expect(
			buildCatchUpLineItems({
				startDate: '2026-07-01',
				today: '2026-09-10',
				monthlyCents: 5000,
				leftoverCents: 100,
				periodStart: '2026-07-01',
				periodEnd: '2026-09-30',
			}),
		).toEqual([
			{ month: '2026-07', amountCents: 5000 },
			{ month: '2026-09', amountCents: 5100 },
		]);
	});

	it('adds leftover cents only on the last billing month of the period', () => {
		expect(
			buildCatchUpLineItems({
				startDate: '2027-06-01',
				today: '2027-07-20',
				monthlyCents: 1000,
				leftoverCents: 50,
				periodStart: '2026-09-01',
				periodEnd: '2027-07-31',
			}),
		).toEqual([
			{ month: '2027-06', amountCents: 1000 },
			{ month: '2027-07', amountCents: 1050 },
		]);
	});
});

describe('buildCatchUpInvoicePlan', () => {
	it('returns null when there is nothing to charge', () => {
		expect(
			buildCatchUpInvoicePlan({
				startDate: '2026-10-01',
				today: '2026-10-20',
				monthlyCents: 7000,
				leftoverCents: 0,
				periodStart: '2026-10-01',
				periodEnd: '2027-07-31',
			}),
		).toBeNull();
	});

	it('sums line amounts and records the covered range', () => {
		expect(
			buildCatchUpInvoicePlan({
				startDate: '2026-10-15',
				today: '2026-12-03',
				monthlyCents: 7338,
				leftoverCents: 0,
				periodStart: '2026-10-15',
				periodEnd: '2027-07-31',
			}),
		).toEqual({
			lines: [
				{ month: '2026-10', amountCents: 7338 },
				{ month: '2026-11', amountCents: 7338 },
				{ month: '2026-12', amountCents: 7338 },
			],
			fromMonth: '2026-10',
			toMonth: '2026-12',
			amountCents: 22014,
		});
	});
});

describe('filterPhasesAfterCatchUpMonth', () => {
	it('drops phases covered by the catch-up invoice', () => {
		const phases = buildPhases('2026-09-01', '2027-07-31', 1000, 50);
		const remaining = filterPhasesAfterCatchUpMonth(phases, '2026-12');
		expect(remaining.map((phase) => phase.label)).toEqual([
			'2027-01',
			'2027-02',
			'2027-03',
			'2027-04',
			'2027-05',
			'2027-06',
			'2027-07',
		]);
		expect(remaining[remaining.length - 1]?.amountCents).toBe(1050);
	});
});

describe('catch-up descriptions and idempotency keys', () => {
	it('formats Dutch descriptions', () => {
		expect(catchUpLineDescription('2026-10')).toBe('Lesgeld 10-2026');
		expect(catchUpInvoiceDescription('2026-10', '2026-12')).toBe('Lesgeld 10-2026 t/m 12-2026 (inhaalfactuur)');
	});

	it('builds deterministic idempotency keys', () => {
		expect(buildCatchUpInvoiceIdempotencyKey('a1', '2026-10', '2026-12')).toBe(
			'mcp_catchup_invoice_a1_2026-10_2026-12',
		);
		expect(buildCatchUpLineIdempotencyKey('a1', '2026-10', '2026-12', '2026-11')).toBe(
			'mcp_catchup_invoice_a1_2026-10_2026-12_item_2026-11',
		);
	});
});
