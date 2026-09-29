import { describe, expect, it } from 'bun:test';
import { PRIMARY_HEX } from '../../../src/lib/color/brand-hex';
import {
	buildCompanyBlockLines,
	buildPdfPaymentNoteText,
	PDF_RGB,
	resolveBillToCityLine,
	resolveBillToEmail,
	resolveBillToName,
	shouldUseDebtorBillTo,
} from '../../../supabase/functions/generate-invoice/buildPdfPure';

const student = {
	user_id: 'student-1',
	first_name: 'Jan',
	last_name: 'Leerling',
	email: 'jan@test.nl',
	date_of_birth: '2010-01-01',
	parent_email: 'ouder@test.nl',
	parent_name: 'Ouder',
	debtor_name: 'Debiteur BV',
	debtor_address: 'Straat 1',
	debtor_postal_code: '1234 AB',
	debtor_city: 'Harderwijk',
	debtor_info_same_as_student: false,
};

function normalizedRgbToHex(red: number, green: number, blue: number): string {
	const toHex = (n: number) =>
		Math.round(Math.min(255, Math.max(0, n * 255)))
			.toString(16)
			.padStart(2, '0');
	return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

describe('PDF_RGB', () => {
	it('matches PRIMARY_HEX brand primary', () => {
		expect(normalizedRgbToHex(PDF_RGB.red, PDF_RGB.green, PDF_RGB.blue)).toBe(PRIMARY_HEX);
	});
});

describe('buildCompanyBlockLines', () => {
	it('builds company lines from settings', () => {
		expect(
			buildCompanyBlockLines({
				company_address: 'Straat 1',
				company_postcode: '1234 AB',
				company_city: 'Harderwijk',
				company_email: 'info@test.nl',
			}),
		).toEqual(['Straat 1', '1234 AB Harderwijk', 'info@test.nl']);
	});
});

describe('shouldUseDebtorBillTo', () => {
	it('returns true when debtor info differs from student', () => {
		expect(shouldUseDebtorBillTo(student)).toBe(true);
	});

	it('returns false when debtor info matches student', () => {
		expect(shouldUseDebtorBillTo({ ...student, debtor_info_same_as_student: true })).toBe(false);
	});
});

describe('resolveBillToName', () => {
	it('returns debtor name when billing to debtor', () => {
		expect(resolveBillToName(student, true)).toBe('Debiteur BV');
	});

	it('returns student name when billing to student', () => {
		expect(resolveBillToName(student, false)).toBe('Jan Leerling');
	});
});

describe('resolveBillToCityLine', () => {
	it('returns combined postal code and city', () => {
		expect(resolveBillToCityLine(student)).toBe('1234 AB Harderwijk');
	});

	it('returns null when postal code and city are missing', () => {
		expect(resolveBillToCityLine({ ...student, debtor_postal_code: null, debtor_city: null })).toBeNull();
	});
});

describe('resolveBillToEmail', () => {
	it('prefers parent email over student email', () => {
		expect(resolveBillToEmail(student)).toBe('ouder@test.nl');
	});
});

describe('buildPdfPaymentNoteText', () => {
	it('builds sepa mandate payment note', () => {
		expect(buildPdfPaymentNoteText({}, '2026-07-17', 'MND-001', () => '17-07-2026')).toBe(
			'Dit bedrag wordt automatisch geïncasseerd op of rond 17-07-2026 via SEPA-mandaat MND-001.',
		);
	});

	it('builds manual transfer payment note', () => {
		expect(
			buildPdfPaymentNoteText(
				{ company_iban: 'NL00TEST', invoice_payment_term_days: 14 },
				'2026-07-17',
				null,
				() => '',
			),
		).toBe('Gelieve het bedrag binnen 14 dagen over te maken naar NL00TEST.');
	});
});
