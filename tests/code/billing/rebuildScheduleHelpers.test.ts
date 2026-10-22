import { describe, expect, it } from 'bun:test';
import {
	collectKeptSchedulePhases,
	inheritSchedulePaymentMethod,
	resolveSchedulePhasePaymentMethod,
} from '../../../supabase/functions/_shared/rebuildScheduleHelpers';

describe('resolveSchedulePhasePaymentMethod', () => {
	it('returns string payment method ids', () => {
		expect(resolveSchedulePhasePaymentMethod('pm_123')).toBe('pm_123');
	});

	it('extracts id from object payment method', () => {
		expect(resolveSchedulePhasePaymentMethod({ id: 'pm_456' })).toBe('pm_456');
	});
});

describe('collectKeptSchedulePhases', () => {
	it('keeps past phases and finds first future index', () => {
		const result = collectKeptSchedulePhases(
			[
				{ start_date: 1, end_date: 2, items: [{ price: 'price_old', quantity: 1 }], metadata: {} },
				{ start_date: 9999999999, end_date: null, items: [{ price: 'price_new', quantity: 1 }], metadata: {} },
			],
			100,
		);
		expect(result.firstFutureIndex).toBe(1);
		expect(result.keptPayloads).toHaveLength(1);
	});
});

describe('inheritSchedulePaymentMethod', () => {
	it('returns default payment method from last kept phase', () => {
		expect(
			inheritSchedulePaymentMethod([{ default_payment_method: 'pm_123' }, { default_payment_method: 'pm_456' }]),
		).toBe('pm_456');
	});
});
