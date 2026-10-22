import { describe, expect, it } from 'bun:test';
import {
	canForceStartSchedule,
	readScheduleBillingDetails,
} from '../../../supabase/functions/_shared/force-start-subscription-helpers';

describe('canForceStartSchedule', () => {
	it('allows not_started and active schedules', () => {
		expect(canForceStartSchedule('not_started')).toBe(true);
		expect(canForceStartSchedule('active')).toBe(true);
	});

	it('blocks canceled schedules', () => {
		expect(canForceStartSchedule('canceled')).toBe(false);
	});
});

describe('readScheduleBillingDetails', () => {
	it('reads customer, price, and default payment method ids', () => {
		expect(
			readScheduleBillingDetails({
				customer: { id: 'cus_1' },
				phases: [
					{
						default_payment_method: { id: 'pm_1' },
						items: [{ price: { id: 'price_1' } }],
					},
				],
			}),
		).toEqual({
			customerId: 'cus_1',
			priceId: 'price_1',
			defaultPaymentMethod: 'pm_1',
		});
	});

	it('returns null ids when schedule data is incomplete', () => {
		expect(
			readScheduleBillingDetails({
				customer: null,
				phases: [{ items: [] }],
			}),
		).toEqual({
			customerId: null,
			priceId: null,
			defaultPaymentMethod: undefined,
		});
	});
});
