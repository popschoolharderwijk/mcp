import { describe, expect, it } from 'bun:test';
import {
	buildSignupConfirmationEmailVars,
	buildSignupConfirmationFullName,
	buildSignupConfirmationOptionDetails,
	formatSignupOptionPrice,
	resolveSignupConfirmationRecipientEmail,
} from '../../../supabase/functions/submit-signup-request/sendConfirmationEmailHelpers';

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

describe('formatSignupOptionPrice', () => {
	it('returns empty string when price is missing', () => {
		expect(formatSignupOptionPrice(null)).toBe('');
	});

	it('formats euro amount with comma decimal separator', () => {
		expect(formatSignupOptionPrice(25.5)).toBe('€ 25,50');
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
				price_per_lesson: 20,
			}),
		).toEqual({
			frequentie: 'weekly',
			prijs: '€ 20,00',
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
			prijs_per_les: '€ 20,00',
		});
	});
});
