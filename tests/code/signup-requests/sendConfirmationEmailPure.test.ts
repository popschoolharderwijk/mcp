import { describe, expect, it } from 'bun:test';
import {
	buildSignupConfirmationEmailVars,
	buildSignupConfirmationFullName,
	buildSignupConfirmationOptionDetails,
	formatSignupOptionAmount,
	resolveSignupConfirmationRecipientEmail,
} from '../../../supabase/functions/submit-signup-request/sendConfirmationEmailPure';

const body = {
	lesson_type_id: 'lesson-type-1',
	first_name: 'Anna',
	last_name: 'Jansen',
	email: 'Anna@Example.com',
	parent_email: 'Parent@Example.com',
};

describe('buildSignupConfirmationFullName', () => {
	it('combines trimmed first and last name', () => {
		expect(buildSignupConfirmationFullName(body)).toBe('Anna Jansen');
	});
});

describe('resolveSignupConfirmationRecipientEmail', () => {
	it('uses parent email when available', () => {
		expect(resolveSignupConfirmationRecipientEmail(body)).toBe('parent@example.com');
	});

	it('falls back to student email when parent email is missing', () => {
		expect(resolveSignupConfirmationRecipientEmail({ ...body, parent_email: null })).toBe('anna@example.com');
	});
});

describe('formatSignupOptionAmount', () => {
	it('shows both tariffs per month', () => {
		expect(formatSignupOptionAmount('monthly', { amount_under_21_cents: 7338, amount_adult_cents: 8879 })).toBe(
			'€ 73,38 per maand (21+: € 88,79)',
		);
	});
	it('shows one-off and adult-only tariffs', () => {
		expect(formatSignupOptionAmount('one_off', { amount_under_21_cents: 6600, amount_adult_cents: null })).toBe(
			'€ 66,00 eenmalig',
		);
		expect(formatSignupOptionAmount('one_off', { amount_under_21_cents: null, amount_adult_cents: 8250 })).toBe(
			'€ 82,50 eenmalig (21+-tarief)',
		);
		expect(formatSignupOptionAmount('monthly', null)).toBe('');
	});
});

describe('buildSignupConfirmationOptionDetails', () => {
	it('returns empty details when option is missing', () => {
		expect(buildSignupConfirmationOptionDetails(null)).toEqual({ frequentie: '', prijs: '' });
	});

	it('maps option frequency and price', () => {
		expect(
			buildSignupConfirmationOptionDetails({
				frequency: 'weekly',
				billing_kind: 'monthly',
			}, { amount_under_21_cents: 2455, amount_adult_cents: null }),
		).toEqual({
			frequentie: 'weekly',
			prijs: '€ 24,55 per maand',
		});
	});
});

describe('buildSignupConfirmationEmailVars', () => {
	it('builds template vars for signup confirmation email', () => {
		expect(
			buildSignupConfirmationEmailVars({
				body,
				lessonTypeName: 'Piano',
				optionDetails: { frequentie: 'weekly', prijs: '€ 20,00' },
			}),
		).toEqual({
			leerling_naam: 'Anna Jansen',
			les_type: 'Piano',
			frequentie: 'weekly',
			bedrag: '€ 20,00',
		});
	});
});
