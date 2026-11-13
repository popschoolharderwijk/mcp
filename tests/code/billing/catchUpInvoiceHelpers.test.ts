import { describe, expect, it } from 'bun:test';
import { buildPhases } from '../../../supabase/functions/_shared/billingHelpers';
import {
	buildCatchUpFinalizeIdempotencyKey,
	buildCatchUpInvoiceIdempotencyKey,
	buildCatchUpInvoicePlan,
	buildCatchUpLineIdempotencyKey,
	buildCatchUpLineItems,
	catchUpDraftNeedsLineItems,
	catchUpInvoiceDescription,
	catchUpLineDescription,
	filterPhasesAfterCatchUpMonth,
	listBillingMonthLabels,
	needsCatchUpPaymentMethodUpdate,
	pickActiveGlobalCatchUpProductId,
	pickAdoptableLegacyCatchUpProductId,
	pickReusableCatchUpInvoice,
	resolveExistingCatchUpSettleKind,
	stripeExpandableId,
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
				periodStart: '2026-10-15',
				periodEnd: '2027-07-31',
			}),
		).toEqual([
			{ month: '2026-10', amountCents: 7338 },
			{ month: '2026-11', amountCents: 7338 },
			{ month: '2026-12', amountCents: 7338 },
		]);
	});

	it('skips August and charges July at the same monthly amount', () => {
		expect(
			buildCatchUpLineItems({
				startDate: '2026-07-01',
				today: '2026-09-10',
				monthlyCents: 5000,
				periodStart: '2026-07-01',
				periodEnd: '2026-09-30',
			}),
		).toEqual([
			{ month: '2026-07', amountCents: 5000 },
			{ month: '2026-09', amountCents: 5000 },
		]);
		expect(
			buildCatchUpLineItems({
				startDate: '2027-06-01',
				today: '2027-07-20',
				monthlyCents: 1000,
				periodStart: '2026-09-01',
				periodEnd: '2027-07-31',
			}),
		).toEqual([
			{ month: '2027-06', amountCents: 1000 },
			{ month: '2027-07', amountCents: 1000 },
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
		const phases = buildPhases('2026-09-01', '2027-07-31', 1000);
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
	});
});

describe('catch-up descriptions and idempotency keys', () => {
	it('formats Dutch descriptions', () => {
		expect(catchUpLineDescription('2026-10')).toBe('Lesgeld 10-2026');
		expect(catchUpInvoiceDescription('2026-10', '2026-12')).toBe('Lesgeld 10-2026 t/m 12-2026 (inhaalfactuur)');
	});

	it('builds attempt-scoped catch-up invoice idempotency keys', () => {
		expect(buildCatchUpInvoiceIdempotencyKey('a1', '2026-10', '2026-12', 'seti_1')).toBe(
			'mcp_catchup_invoice_a1_2026-10_2026-12_seti_1',
		);
		expect(buildCatchUpFinalizeIdempotencyKey('a1', '2026-10', '2026-12', 'seti_1')).toBe(
			'mcp_catchup_invoice_a1_2026-10_2026-12_seti_1_finalize',
		);
		expect(buildCatchUpLineIdempotencyKey('a1', '2026-10', '2026-12', '2026-11', 'seti_1')).toBe(
			'mcp_catchup_invoice_a1_2026-10_2026-12_seti_1_item_2026-11',
		);
	});

	it('picks only an active global catch-up product', () => {
		expect(
			pickActiveGlobalCatchUpProductId([
				{
					id: 'prod_legacy',
					active: true,
					metadata: { kind: 'catch_up', lesson_agreement_id: 'a1' },
				},
				{
					id: 'prod_inactive',
					active: false,
					metadata: { kind: 'catch_up', scope: 'global' },
				},
				{
					id: 'prod_global',
					active: true,
					metadata: { kind: 'catch_up', scope: 'global' },
				},
			]),
		).toBe('prod_global');
		expect(
			pickActiveGlobalCatchUpProductId([{ id: 'prod_legacy', active: true, metadata: { kind: 'catch_up' } }]),
		).toBeNull();
	});

	it('adopts active catch-up products not pinned to one agreement', () => {
		expect(
			pickAdoptableLegacyCatchUpProductId([
				{
					id: 'prod_inactive',
					active: false,
					metadata: { kind: 'catch_up' },
				},
				{
					id: 'prod_agreement',
					active: true,
					metadata: { kind: 'catch_up', lesson_agreement_id: 'a1' },
				},
				{
					id: 'prod_shared',
					active: true,
					metadata: { kind: 'catch_up' },
				},
			]),
		).toBe('prod_shared');
		expect(
			pickAdoptableLegacyCatchUpProductId([
				{
					id: 'prod_other',
					active: true,
					metadata: { kind: 'tuition' },
				},
			]),
		).toBeNull();
	});

	it('adds catch-up lines only for empty draft invoices', () => {
		expect(catchUpDraftNeedsLineItems({ status: 'draft', lines: { data: [] } })).toBe(true);
		expect(catchUpDraftNeedsLineItems({ status: 'draft', lines: { data: [{ id: 'il_1' }] } })).toBe(false);
		expect(catchUpDraftNeedsLineItems({ status: 'open', lines: { data: [] } })).toBe(false);
		expect(catchUpDraftNeedsLineItems({ status: 'draft' })).toBe(true);
	});
});

describe('pickReusableCatchUpInvoice', () => {
	it('returns the newest reusable catch-up for the agreement', () => {
		expect(
			pickReusableCatchUpInvoice(
				[
					{
						id: 'in_other',
						status: 'paid',
						metadata: { kind: 'catch_up', lesson_agreement_id: 'other' },
					},
					{
						id: 'in_open',
						status: 'open',
						metadata: { kind: 'catch_up', lesson_agreement_id: 'a1' },
					},
					{
						id: 'in_paid_older',
						status: 'paid',
						metadata: { kind: 'catch_up', lesson_agreement_id: 'a1' },
					},
				],
				'a1',
			)?.id,
		).toBe('in_open');
	});

	it('ignores voided catch-ups so a fresh invoice can be created', () => {
		expect(
			pickReusableCatchUpInvoice(
				[
					{
						id: 'in_void',
						status: 'void',
						metadata: { kind: 'catch_up', lesson_agreement_id: 'a1' },
					},
					{
						id: 'in_sub',
						status: 'paid',
						metadata: { kind: 'subscription', lesson_agreement_id: 'a1' },
					},
				],
				'a1',
			),
		).toBeNull();
	});

	it('reuses draft and paid catch-ups for the same agreement', () => {
		expect(
			pickReusableCatchUpInvoice(
				[{ id: 'in_draft', status: 'draft', metadata: { kind: 'catch_up', lesson_agreement_id: 'a1' } }],
				'a1',
			)?.id,
		).toBe('in_draft');
		expect(
			pickReusableCatchUpInvoice(
				[{ id: 'in_paid', status: 'paid', metadata: { kind: 'catch_up', lesson_agreement_id: 'a1' } }],
				'a1',
			)?.id,
		).toBe('in_paid');
	});
});

describe('catch-up settle helpers', () => {
	it('reads expandable Stripe ids', () => {
		expect(stripeExpandableId(null)).toBeNull();
		expect(stripeExpandableId(undefined)).toBeNull();
		expect(stripeExpandableId('pm_1')).toBe('pm_1');
		expect(stripeExpandableId({ id: 'pm_2' })).toBe('pm_2');
	});

	it('updates payment method only when a different id is provided', () => {
		expect(needsCatchUpPaymentMethodUpdate(null, undefined)).toBe(false);
		expect(needsCatchUpPaymentMethodUpdate('pm_1', undefined)).toBe(false);
		expect(needsCatchUpPaymentMethodUpdate('pm_1', 'pm_1')).toBe(false);
		expect(needsCatchUpPaymentMethodUpdate('pm_1', 'pm_2')).toBe(true);
		expect(needsCatchUpPaymentMethodUpdate(null, 'pm_2')).toBe(true);
	});

	it('routes existing catch-up settle by invoice status', () => {
		expect(resolveExistingCatchUpSettleKind('paid')).toBe('done');
		expect(resolveExistingCatchUpSettleKind('void')).toBe('done');
		expect(resolveExistingCatchUpSettleKind('open')).toBe('pay_open');
		expect(resolveExistingCatchUpSettleKind('draft')).toBe('finalize_draft');
	});
});
