import { describe, expect, it } from 'bun:test';
import {
	readGeneratedSepaDebitFromDetails,
	readGeneratedSepaDebitPaymentMethodId,
} from '../../../supabase/functions/_shared/stripeHelpers';

describe('readGeneratedSepaDebitFromDetails', () => {
	it('reads direct generated sepa debit id', () => {
		expect(readGeneratedSepaDebitFromDetails({ generated_sepa_debit: 'pm_1' })).toBe('pm_1');
	});

	it('reads nested generated sepa debit id', () => {
		expect(
			readGeneratedSepaDebitFromDetails({
				sepa_debit: { generated_sepa_debit: 'pm_nested' },
			}),
		).toBe('pm_nested');
	});

	it('returns null when generated sepa debit id is missing', () => {
		expect(readGeneratedSepaDebitFromDetails({ type: 'sepa_debit' })).toBeNull();
	});
});

describe('readGeneratedSepaDebitPaymentMethodId', () => {
	it('reads generated sepa debit id from latest attempt', () => {
		expect(
			readGeneratedSepaDebitPaymentMethodId({
				payment_method_details: { generated_sepa_debit: 'pm_1' },
			}),
		).toBe('pm_1');
	});

	it('returns null when latest attempt is missing', () => {
		expect(readGeneratedSepaDebitPaymentMethodId(null)).toBeNull();
	});
});
