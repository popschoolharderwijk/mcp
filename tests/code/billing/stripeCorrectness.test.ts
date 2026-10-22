import { describe, expect, it } from 'bun:test';
import {
	findRecordedFirstInvoice,
	type RecoverableInvoice,
	recoverFirstInvoice,
	shouldCatchUp,
} from '../../../supabase/functions/_shared/firstInvoiceRecoveryPure';
import { deliverPaymentLink } from '../../../supabase/functions/_shared/paymentLinkDeliveryPure';
import {
	collectOpenSchedules,
	findDuplicateScheduleGroups,
	selectAdoptableSchedule,
} from '../../../supabase/functions/_shared/scheduleClaimPure';
import {
	resolveStripeBillingIdentity,
	stripeBillingIdentityChanged,
} from '../../../supabase/functions/_shared/stripeBillingIdentityPure';

describe('Stripe correctness rules', () => {
	it('pending state without invoice id discovers the original catch-up coverage across both kinds', async () => {
		async function* invoices() {
			yield {
				id: 'other',
				status: 'paid',
				metadata: { lesson_agreement_id: 'other', kind: 'first_month', month: '2026-09-01' },
			};
			yield {
				id: 'original',
				status: 'draft',
				metadata: { lesson_agreement_id: 'a', kind: 'catch_up', month: '2026-09-01', to_month: '2026-10-01' },
			};
		}
		const invoice = await findRecordedFirstInvoice(invoices(), { agreementId: 'a', month: '2026-09-01' });
		expect(invoice?.id).toBe('original');
		expect(invoice?.metadata.to_month).toBe('2026-10-01');
	});
	it('discovery refuses overlapping first-month and catch-up invoices', async () => {
		async function* invoices() {
			for (const kind of ['first_month', 'catch_up'])
				yield { id: kind, status: 'draft', metadata: { lesson_agreement_id: 'a', kind, month: '2026-09-01' } };
		}
		await expect(findRecordedFirstInvoice(invoices(), { agreementId: 'a', month: '2026-09-01' })).rejects.toThrow(
			'Meerdere eerste facturen',
		);
	});
	it('failed delivery keeps the previous token; success commits only after send', async () => {
		const events: string[] = [];
		expect(
			await deliverPaymentLink(
				async () => false,
				async () => {
					events.push('commit');
				},
			),
		).toBe(false);
		expect(events).toEqual([]);
		expect(
			await deliverPaymentLink(
				async () => {
					events.push('sent');
					return true;
				},
				async () => {
					events.push('commit');
				},
			),
		).toBe(true);
		expect(events).toEqual(['sent', 'commit']);
	});
	it('uses the parent email/name and detects an outdated customer', () => {
		const payer = resolveStripeBillingIdentity({
			accountEmail: 'student@example.com',
			parentEmail: 'parent@example.com',
			firstName: 'Student',
			parentName: 'Parent',
		});
		expect(payer).toEqual({ email: 'parent@example.com', name: 'Parent' });
		expect(stripeBillingIdentityChanged({ email: 'student@example.com', name: 'Student' }, payer)).toBe(true);
		expect(stripeBillingIdentityChanged(payer, payer)).toBe(false);
		expect(
			resolveStripeBillingIdentity({
				accountEmail: 'student@example.com',
				firstName: 'Student',
				debtorName: 'Payer',
				debtorSameAsStudent: false,
			}).name,
		).toBe('Payer');
		expect(resolveStripeBillingIdentity({ accountEmail: 'student@example.com', firstName: 'Student' })).toEqual({
			email: 'student@example.com',
			name: 'Student',
		});
	});
	it('an adopted Stripe schedule without a stored schedule or invoice still needs catch-up', () => {
		expect(shouldCatchUp({ startDate: '2026-09-15', today: '2026-10-22' })).toBe(true);
		expect(shouldCatchUp({ startDate: '2026-09-15', today: '2026-10-22', storedScheduleId: 'sched_1' })).toBe(
			false,
		);
		expect(shouldCatchUp({ startDate: '2026-09-15', today: '2026-10-22', firstInvoiceStatus: 'pending' })).toBe(
			false,
		);
	});
	it('adopts an existing Stripe invoice after idempotency expiry without creating or finalizing again', async () => {
		const events: string[] = [];
		const invoice = {
			id: 'in_existing',
			status: 'paid',
			metadata: { lesson_agreement_id: 'agreement', kind: 'catch_up', month: '2026-09-01' },
		};
		async function* invoices() {
			yield invoice;
		}
		expect(
			await recoverFirstInvoice({
				invoices: invoices(),
				target: { agreementId: 'agreement', kind: 'catch_up', month: '2026-09-01' },
				create: async () => {
					throw new Error('must not create');
				},
				record: async (row) => {
					events.push(row.id);
				},
				completeDraft: async () => {
					throw new Error('must not finalize');
				},
			}),
		).toBe('in_existing');
		expect(events).toEqual(['in_existing']);
	});
	it('records a new draft before completing it and resumes it after a write failure', async () => {
		const draft: RecoverableInvoice = {
			id: 'in_draft',
			status: 'draft',
			metadata: { lesson_agreement_id: 'a', kind: 'first_month', month: '2026-10-01' },
		};
		const events: string[] = [];
		async function* empty() {}
		await expect(
			recoverFirstInvoice({
				invoices: empty(),
				target: { agreementId: 'a', kind: 'first_month', month: '2026-10-01' },
				create: async () => draft,
				record: async () => {
					throw new Error('write failed');
				},
				completeDraft: async () => {
					events.push('finalize');
				},
			}),
		).rejects.toThrow('write failed');
		expect(events).toEqual([]);
		async function* existing() {
			yield draft;
		}
		await recoverFirstInvoice({
			invoices: existing(),
			target: { agreementId: 'a', kind: 'first_month', month: '2026-10-01' },
			create: async () => {
				throw new Error('duplicate');
			},
			record: async () => {
				events.push('record');
			},
			completeDraft: async () => {
				events.push('finalize');
			},
		});
		expect(events).toEqual(['record', 'finalize']);
	});
	it('finds adoption and duplicates beyond the first thousand schedules and excludes released', async () => {
		async function* pages() {
			for (let i = 0; i < 1100; i++)
				yield { id: `s_${i}`, created: i, status: 'active', metadata: { lesson_agreement_id: `a_${i}` } };
			yield {
				id: 'duplicate',
				created: 1101,
				status: 'not_started',
				metadata: { lesson_agreement_id: 'a_1099' },
			};
			yield { id: 'released', created: 0, status: 'released', metadata: { lesson_agreement_id: 'a_1099' } };
		}
		const schedules = await collectOpenSchedules(pages());
		expect(selectAdoptableSchedule(schedules, 'a_1099')?.id).toBe('s_1099');
		expect(findDuplicateScheduleGroups(schedules)).toEqual([
			{ agreementId: 'a_1099', scheduleIds: ['s_1099', 'duplicate'] },
		]);
	});
});
