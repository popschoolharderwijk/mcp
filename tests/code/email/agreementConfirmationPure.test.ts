import { describe, expect, it } from 'bun:test';
import { shouldShowResendInvitation } from '../../../src/lib/subscriptions/subscriptionCardHelpers';
import {
	buildAgreementPaymentVars,
	wasTemplateEmailDelivered,
} from '../../../supabase/functions/_shared/agreementConfirmationPure';
import { buildPaymentPreview, resolveBillingRecipient } from '../../../supabase/functions/_shared/paymentLinkPure';

const monthly = { month: '2026-11-01', amountCents: 7338, btwRate: 0, isProrated: false };
const input = {
	paymentMethod: 'stripe',
	preview: { monthly, firstMonth: null, catchUp: null },
	minimumTermEnd: '2027-04-30',
	link: 'https://mcp.mplifi.nl/direct-debit/start?t=token',
};
describe('agreement confirmation rules', () => {
	it('one-off course keeps its exact start-month fee even after start and has no payment link', () => {
		const preview = buildPaymentPreview({
			billingKind: 'one_off',
			startDate: '2026-09-15',
			today: '2026-10-22',
			months: [
				{ month: '2026-09-01', amount_cents: 12000, btw_rate: 21, is_prorated: false },
				{ month: '2026-10-01', amount_cents: 0, btw_rate: 21, is_prorated: false },
			],
		});
		const vars = buildAgreementPaymentVars({ ...input, billingKind: 'one_off', preview });
		expect(vars.bedrag).toBe('€ 120,00 (inclusief 21% btw)');
		expect(vars.link).toBe('');
		expect(preview.catchUp).toBeNull();
		expect(preview.firstMonth).toBeNull();
	});
	it('automatic payment includes the fixed link and exact SQL amount', () => {
		const vars = buildAgreementPaymentVars(input);
		expect(vars.link).toBe(input.link);
		expect(vars.bedrag).toBe('€ 73,38 (vrijgesteld van btw)');
	});
	it('invoice payment never has a payment link', () => {
		expect(buildAgreementPaymentVars({ ...input, paymentMethod: 'manual' }).link).toBe('');
	});
	it('first month preserves SQL prorated amount', () => {
		const vars = buildAgreementPaymentVars({
			...input,
			preview: { ...input.preview, firstMonth: { ...monthly, amountCents: 2604, isProrated: true } },
		});
		expect(vars.eerste_maand_bedrag).toBe('€ 26,04');
		expect(vars.inhaal_bedrag).toBe('');
	});
	it('catch-up preserves SQL total instead of a separate first month', () => {
		const vars = buildAgreementPaymentVars({
			...input,
			preview: {
				...input.preview,
				catchUp: { lines: [monthly], amountCents: 9938, fromMonth: '2026-10-01', toMonth: '2026-11-01' },
			},
		});
		expect(vars.inhaal_bedrag).toBe('€ 99,38');
		expect(vars.eerste_maand_bedrag).toBe('');
	});
	it('parent receives confirmation before account', () => {
		expect(
			resolveBillingRecipient({ parentEmail: 'parent@example.com', accountEmail: 'student@example.com' }),
		).toBe('parent@example.com');
	});
	it('falls back to account', () => {
		expect(resolveBillingRecipient({ parentEmail: '', accountEmail: 'student@example.com' })).toBe(
			'student@example.com',
		);
	});
	it('disabled mail is not delivered', () => {
		expect(wasTemplateEmailDelivered({ skipped: true })).toBe(false);
		expect(wasTemplateEmailDelivered({ ok: true })).toBe(true);
		expect(wasTemplateEmailDelivered({ error: 'failed' })).toBe(false);
	});
	it('resend is hidden after a mandate has a schedule', () => {
		expect(shouldShowResendInvitation({ stripe_schedule_id: 'sched_1' })).toBe(false);
		expect(shouldShowResendInvitation({ stripe_subscription_id: 'sub_1' })).toBe(false);
		expect(shouldShowResendInvitation(null)).toBe(true);
	});
});
