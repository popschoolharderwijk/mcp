import { describe, expect, it } from 'bun:test';
import {
	buildSignupConfirmationOptionDetails,
	buildSignupConfirmEmailVars,
	buildSignupConfirmUrl,
	buildSignupMailBaseVars,
	buildSignupMailFullName,
	formatSignupOptionPrice,
	resolveSignupMailRecipientEmail,
} from '../../../supabase/functions/_shared/signup/mailHelpers';

const body = {
	first_name: 'Anna',
	last_name: 'Jansen',
	email: 'Anna@Example.com',
	parent_email: 'Parent@Example.com',
};

describe('signup mail helpers', () => {
	it('builds full name and prefers parent recipient email', () => {
		expect(buildSignupMailFullName(body)).toBe('Anna Jansen');
		expect(resolveSignupMailRecipientEmail(body)).toBe('parent@example.com');
		expect(resolveSignupMailRecipientEmail({ ...body, parent_email: null })).toBe('anna@example.com');
	});

	it('formats option details and base vars', () => {
		expect(formatSignupOptionPrice(null)).toBe('');
		expect(formatSignupOptionPrice(25.5)).toBe('€ 25,50');
		expect(buildSignupConfirmationOptionDetails(null)).toEqual({ frequentie: '', prijs: '' });
		expect(
			buildSignupConfirmationOptionDetails({
				frequency: 'weekly',
				price_per_lesson: 20,
			}),
		).toEqual({ frequentie: 'Wekelijks', prijs: '€ 20,00' });
		expect(
			buildSignupMailBaseVars({
				body,
				lessonTypeName: 'Piano',
				optionDetails: { frequentie: 'Wekelijks', prijs: '€ 20,00' },
			}),
		).toEqual({
			leerling_naam: 'Anna Jansen',
			les_type: 'Piano',
			frequentie: 'Wekelijks',
			prijs_per_les: '€ 20,00',
		});
	});

	it('adds a markdown-safe confirm URL variable', () => {
		expect(buildSignupConfirmUrl('https://example.com/', 'tok')).toBe(
			'https://example.com/signup/confirm?token=tok',
		);
		expect(
			buildSignupConfirmEmailVars({
				body,
				lessonTypeName: 'Piano',
				optionDetails: { frequentie: 'Wekelijks', prijs: '€ 20,00' },
				confirmUrl: 'https://example.com/signup/confirm?token=tok',
			}).bevestigingslink,
		).toBe('https://example.com/signup/confirm?token=tok');
	});
});
