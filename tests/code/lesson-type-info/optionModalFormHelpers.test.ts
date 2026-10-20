import { describe, expect, it } from 'bun:test';
import { updateOptionModalField } from '../../../src/pages/lesson-type-info/optionModalFormHelpers';

const baseForm = {
	duration_minutes: '30',
	frequency: 'weekly' as const,
	label: '',
	billing_kind: 'monthly' as const,
	has_adult_tariff: true,
	effective_from: '2026-09-01',
	amount_under_21: '73.38',
	amount_adult: '88.79',
};

describe('updateOptionModalField', () => {
	it('updates a single field', () => {
		expect(updateOptionModalField(baseForm, 'duration_minutes', '45')).toEqual({ ...baseForm, duration_minutes: '45' });
	});

	it('clears the 21+ amount when the 21+ tariff is switched off', () => {
		expect(updateOptionModalField(baseForm, 'has_adult_tariff', false)).toEqual({
			...baseForm,
			has_adult_tariff: false,
			amount_adult: '',
		});
	});
});
