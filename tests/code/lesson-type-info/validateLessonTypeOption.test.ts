import { describe, expect, it } from 'bun:test';
import {
	getOptionModalValidationError,
	getOptionRowValidationError,
} from '../../../src/pages/lesson-type-info/validateLessonTypeOption';

const validOptionForm = {
	duration_minutes: '30',
	frequency: 'weekly' as const,
	label: '',
	billing_kind: 'monthly' as const,
	has_adult_tariff: true,
	effective_from: '2026-09-01',
	amount_under_21: '73.38',
	amount_adult: '88.79',
};

describe('getOptionModalValidationError', () => {
	it('returns null for valid values', () => {
		expect(getOptionModalValidationError(validOptionForm)).toBeNull();
	});

	it('rejects an invalid duration', () => {
		expect(getOptionModalValidationError({ ...validOptionForm, duration_minutes: '0' })).toBe(
			'Duur moet een positief getal zijn',
		);
	});

	it('requires an effective date', () => {
		expect(getOptionModalValidationError({ ...validOptionForm, effective_from: '' })).toBe(
			'Kies een ingangsdatum voor het tarief',
		);
	});

	it('accepts a form with only a 21+ amount (e.g. Laatbloeiers)', () => {
		expect(getOptionModalValidationError({ ...validOptionForm, amount_under_21: '' })).toBeNull();
	});

	it('requires the under-21 amount when there is no 21+ tariff', () => {
		expect(
			getOptionModalValidationError({ ...validOptionForm, has_adult_tariff: false, amount_under_21: '' }),
		).toBe('Vul een bedrag onder 21 in');
	});
});

describe('getOptionRowValidationError', () => {
	it('prefixes the option number', () => {
		expect(getOptionRowValidationError({ ...validOptionForm, amount_under_21: '', amount_adult: '' }, 1)).toBe(
			'Optie 2: vul een bedrag onder 21 of een 21+-bedrag in',
		);
	});
});
