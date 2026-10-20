import { describe, expect, it } from 'bun:test';
import type { AccountingSettings } from '../../../src/lib/accounting/types';
import {
	buildAccountingSettingsUpdatePayload,
	clampCancellationNoticeDays,
	clampInvoicePaymentTermDays,
	clampSchoolYearStartMonth,
	clampSepaCollectionDay,
	resolveAccountingSettingsSaveErrorMessage,
	resolveAccountingSettingsSaveSuccessMessage,
} from '../../../src/lib/settings/accountingSettingsManagerHelpers';

const sampleSettings = {
	journal_code_memoriaal: '90',
	journal_code_bank: '20',
	account_debiteuren: '1300',
	account_omzet_under_21: '8000',
	account_omzet_21_plus: '8010',
	account_btw_21: '1500',
	account_bank_stripe: '1101',
	account_bank_sepa: '1102',
	btw_code_21: 'VH',
	btw_code_exempt: '0',
	currency: 'EUR',
	school_year_start_month: 9,
	description_template: 'Lesgeld {periode}',
	payment_provider: 'sepa',
	sepa_creditor_name: 'Popschool',
	sepa_creditor_iban: 'NL00BANK0123456789',
	sepa_creditor_bic: 'BANKNL2A',
	sepa_creditor_id: 'NL00ZZZ123456780000',
	sepa_collection_day: 27,
	sepa_remittance_template: 'Lesgeld {periode} - {leerling}',
	sepa_mandate_prefix: 'MND',
	company_name: 'Popschool',
	company_address: 'Hoofdstraat 1',
	company_postcode: '3841 AB',
	company_city: 'Harderwijk',
	company_kvk: '12345678',
	company_btw_nummer: 'NL123456789B01',
	company_iban: 'NL00BANK0123456789',
	company_email: 'info@example.nl',
	company_phone: '0341-123456',
	company_logo_url: null,
	invoice_number_prefix: 'INV-',
	invoice_payment_term_days: 14,
	invoice_footer_text: 'Bedankt',
	cancellation_notice_days: 30,
} as AccountingSettings;

describe('buildAccountingSettingsUpdatePayload', () => {
	it('maps editable accounting settings fields', () => {
		expect(buildAccountingSettingsUpdatePayload(sampleSettings)).toEqual({
			journal_code_memoriaal: '90',
			journal_code_bank: '20',
			account_debiteuren: '1300',
			account_omzet_under_21: '8000',
			account_omzet_21_plus: '8010',
			account_btw_21: '1500',
			account_bank_stripe: '1101',
			account_bank_sepa: '1102',
			btw_code_21: 'VH',
			btw_code_exempt: '0',
			currency: 'EUR',
			school_year_start_month: 9,
			description_template: 'Lesgeld {periode}',
			payment_provider: 'sepa',
			sepa_creditor_name: 'Popschool',
			sepa_creditor_iban: 'NL00BANK0123456789',
			sepa_creditor_bic: 'BANKNL2A',
			sepa_creditor_id: 'NL00ZZZ123456780000',
			sepa_collection_day: 27,
			sepa_remittance_template: 'Lesgeld {periode} - {leerling}',
			sepa_mandate_prefix: 'MND',
			company_name: 'Popschool',
			company_address: 'Hoofdstraat 1',
			company_postcode: '3841 AB',
			company_city: 'Harderwijk',
			company_kvk: '12345678',
			company_btw_nummer: 'NL123456789B01',
			company_iban: 'NL00BANK0123456789',
			company_email: 'info@example.nl',
			company_phone: '0341-123456',
			company_logo_url: null,
			invoice_number_prefix: 'INV-',
			invoice_payment_term_days: 14,
			invoice_footer_text: 'Bedankt',
			cancellation_notice_days: 30,
		});
	});
});

describe('clampSepaCollectionDay', () => {
	it('clamps values to valid collection day range', () => {
		expect(clampSepaCollectionDay(40)).toBe(28);
		expect(clampSepaCollectionDay(0)).toBe(27);
		expect(clampSepaCollectionDay(15)).toBe(15);
	});
});

describe('clampSchoolYearStartMonth', () => {
	it('clamps values to valid month range', () => {
		expect(clampSchoolYearStartMonth(15)).toBe(12);
		expect(clampSchoolYearStartMonth(0)).toBe(1);
		expect(clampSchoolYearStartMonth(9)).toBe(9);
	});
});

describe('clampInvoicePaymentTermDays', () => {
	it('clamps values to valid payment term range', () => {
		expect(clampInvoicePaymentTermDays(120)).toBe(90);
		expect(clampInvoicePaymentTermDays(0)).toBe(14);
		expect(clampInvoicePaymentTermDays(14)).toBe(14);
	});
});

describe('resolveAccountingSettingsSaveSuccessMessage', () => {
	it('returns Dutch success message', () => {
		expect(resolveAccountingSettingsSaveSuccessMessage()).toBe('Boekhoud-instellingen opgeslagen');
	});
});

describe('resolveAccountingSettingsSaveErrorMessage', () => {
	it('returns Dutch error message with details', () => {
		expect(resolveAccountingSettingsSaveErrorMessage('permission denied')).toBe(
			'Opslaan mislukt: permission denied',
		);
	});
});

describe('clampCancellationNoticeDays', () => {
	it('keeps the notice period between 0 and 365 days', () => {
		expect(clampCancellationNoticeDays(-5)).toBe(0);
		expect(clampCancellationNoticeDays(400)).toBe(365);
		expect(clampCancellationNoticeDays(Number.NaN)).toBe(30);
		expect(clampCancellationNoticeDays(28)).toBe(28);
	});
});
