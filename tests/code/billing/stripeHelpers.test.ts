import { describe, expect, it } from 'bun:test';
import {
	getStripeId,
	readGeneratedSepaDebitFromDetails,
	readGeneratedSepaDebitPaymentMethodId,
	readPaymentMethodFingerprint,
	selectDuplicateFingerprintPaymentMethodIds,
} from '../../../supabase/functions/_shared/stripeHelpers';

describe('getStripeId', () => {
	it('returns string ids unchanged', () => {
		expect(getStripeId('sub_123')).toBe('sub_123');
	});

	it('reads id from expanded objects', () => {
		expect(getStripeId({ id: 'pm_456' })).toBe('pm_456');
	});

	it('returns null for non-objects', () => {
		expect(getStripeId(null)).toBeNull();
	});
});

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

describe('payment method fingerprint duplicates', () => {
	it('reads sepa and card fingerprints', () => {
		expect(
			readPaymentMethodFingerprint({
				id: 'pm_sepa',
				type: 'sepa_debit',
				sepa_debit: { fingerprint: 'fp_sepa' },
			}),
		).toBe('fp_sepa');
		expect(
			readPaymentMethodFingerprint({
				id: 'pm_card',
				type: 'card',
				card: { fingerprint: 'fp_card' },
			}),
		).toBe('fp_card');
		expect(readPaymentMethodFingerprint({ id: 'pm_ideal', type: 'ideal' })).toBeNull();
	});

	it('selects only same-type same-fingerprint duplicates', () => {
		expect(
			selectDuplicateFingerprintPaymentMethodIds(
				{
					id: 'pm_new',
					type: 'sepa_debit',
					sepa_debit: { fingerprint: 'kltLlWO5ST2McK7b' },
				},
				[
					{
						id: 'pm_new',
						type: 'sepa_debit',
						sepa_debit: { fingerprint: 'kltLlWO5ST2McK7b' },
					},
					{
						id: 'pm_old_same',
						type: 'sepa_debit',
						sepa_debit: { fingerprint: 'kltLlWO5ST2McK7b' },
					},
					{
						id: 'pm_other_bank',
						type: 'sepa_debit',
						sepa_debit: { fingerprint: 'other_fp' },
					},
					{
						id: 'pm_card_same_fp',
						type: 'card',
						card: { fingerprint: 'kltLlWO5ST2McK7b' },
					},
				],
			),
		).toEqual(['pm_old_same']);
	});

	it('selects nothing when the kept method has no fingerprint', () => {
		expect(
			selectDuplicateFingerprintPaymentMethodIds(
				{ id: 'pm_new', type: 'sepa_debit', sepa_debit: { fingerprint: null } },
				[{ id: 'pm_old', type: 'sepa_debit', sepa_debit: { fingerprint: 'fp' } }],
			),
		).toEqual([]);
	});
});
