import { describe, expect, it } from 'bun:test';
import {
	buildCatchUpNoticeText,
	formatCentsNl,
	formatTermText,
	markPaymentLinkArranged,
	resolveCheckoutStartError,
	resolveCompleteCheckoutErrorMessage,
	resolvePaymentLinkInfoFromInvoke,
	resolvePayPageView,
	shouldSkipCompleteCheckout,
} from '../../../src/lib/stripe/paymentLinkPageHelpers';

describe('paymentLinkPageHelpers', () => {
	it('formats amounts and term text', () => {
		expect(formatCentsNl(1250)).toBe('€ 12,50');
		expect(formatTermText(null)).toContain('6 maanden');
		expect(formatTermText('2027-02-28')).toContain('28-02-2027');
	});

	it('builds catch-up notice text with and without month range', () => {
		expect(
			buildCatchUpNoticeText({
				monthlyCents: 7000,
				yearlyCents: 70000,
				finalMonthCents: null,
				catchUp: false,
				catchUpCents: null,
				catchUpFromMonth: null,
				catchUpToMonth: null,
			}),
		).toBeNull();
		expect(
			buildCatchUpNoticeText({
				monthlyCents: 7000,
				yearlyCents: 70000,
				finalMonthCents: null,
				catchUp: true,
				catchUpCents: null,
				catchUpFromMonth: '2026-09',
				catchUpToMonth: '2026-11',
			}),
		).toBeNull();
		expect(
			buildCatchUpNoticeText({
				monthlyCents: 7000,
				yearlyCents: 70000,
				finalMonthCents: null,
				catchUp: true,
				catchUpCents: 21000,
				catchUpFromMonth: null,
				catchUpToMonth: null,
			}),
		).toBe(
			'Omdat de startdatum al voorbij is, brengen we gemiste maanden in één keer in rekening na je machtiging: € 210,00 (augustus telt niet mee).',
		);
		expect(
			buildCatchUpNoticeText({
				monthlyCents: 7000,
				yearlyCents: 70000,
				finalMonthCents: null,
				catchUp: true,
				catchUpCents: 21000,
				catchUpFromMonth: '2026-09',
				catchUpToMonth: '2026-11',
			}),
		).toBe(
			'Omdat de startdatum al voorbij is, brengen we gemiste maanden (09-2026 t/m 11-2026) in één keer in rekening na je machtiging: € 210,00 (augustus telt niet mee).',
		);
	});

	it('resolves pay page view branches', () => {
		expect(resolvePayPageView({ loadingInfo: true, completed: false, info: null })).toBe('loading');
		expect(resolvePayPageView({ loadingInfo: false, completed: true, info: null })).toBe('completed');
		expect(
			resolvePayPageView({
				loadingInfo: false,
				completed: true,
				info: { valid: true, arranged: true },
			}),
		).toBe('completed');
		expect(
			resolvePayPageView({ loadingInfo: false, completed: false, info: { valid: true, arranged: true } }),
		).toBe('arranged');
		expect(
			resolvePayPageView({
				loadingInfo: false,
				completed: false,
				info: { valid: true, arranged: true },
				error: 'Inhaalfactuur mislukte',
			}),
		).toBe('details');
		expect(resolvePayPageView({ loadingInfo: false, completed: false, info: { valid: false } })).toBe('invalid');
		expect(resolvePayPageView({ loadingInfo: false, completed: false, info: { valid: true } })).toBe('details');
	});

	it('maps invoke and checkout errors', async () => {
		expect(resolvePaymentLinkInfoFromInvoke(null, new Error('x'))).toEqual({ valid: false });
		expect(resolvePaymentLinkInfoFromInvoke({ valid: true }, null)).toEqual({ valid: true });
		expect(await resolveCheckoutStartError(new Error('boom'), undefined)).toBe('Kon Stripe Checkout niet starten');
		expect(await resolveCheckoutStartError(null, 'https://stripe.test')).toBe('');
		expect(shouldSkipCompleteCheckout(null, 'a', 't', false)).toBe(true);
		expect(shouldSkipCompleteCheckout('cs_1', 'a', 't', false)).toBe(false);
		expect(await resolveCompleteCheckoutErrorMessage(new Error('x'))).toBe('Afronden mislukt');
		expect(await resolveCompleteCheckoutErrorMessage(null)).toBeNull();
		expect(markPaymentLinkArranged({ valid: true })).toEqual({ valid: true, arranged: true });
	});
});
