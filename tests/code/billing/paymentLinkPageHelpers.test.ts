import { describe, expect, it } from 'bun:test';
import {
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

	it('resolves pay page view branches', () => {
		expect(resolvePayPageView({ loadingInfo: true, completed: false, info: null })).toBe('loading');
		expect(resolvePayPageView({ loadingInfo: false, completed: true, info: null })).toBe('arranged');
		expect(
			resolvePayPageView({ loadingInfo: false, completed: false, info: { valid: true, arranged: true } }),
		).toBe('arranged');
		expect(resolvePayPageView({ loadingInfo: false, completed: false, info: { valid: false } })).toBe('invalid');
		expect(resolvePayPageView({ loadingInfo: false, completed: false, info: { valid: true } })).toBe('details');
	});

	it('maps invoke and checkout errors', () => {
		expect(resolvePaymentLinkInfoFromInvoke(null, new Error('x'))).toEqual({ valid: false });
		expect(resolvePaymentLinkInfoFromInvoke({ valid: true }, null)).toEqual({ valid: true });
		expect(resolveCheckoutStartError({ message: 'boom' }, undefined)).toBe('boom');
		expect(resolveCheckoutStartError(null, 'https://stripe.test')).toBe('');
		expect(shouldSkipCompleteCheckout(null, 'a', 't', false)).toBe(true);
		expect(shouldSkipCompleteCheckout('cs_1', 'a', 't', false)).toBe(false);
		expect(resolveCompleteCheckoutErrorMessage({ message: 'x' })).toBe('x');
		expect(resolveCompleteCheckoutErrorMessage(null)).toBeNull();
		expect(markPaymentLinkArranged({ valid: true })).toEqual({ valid: true, arranged: true });
	});
});
