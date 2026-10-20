import type { AccountingSettings } from '@/lib/accounting/types';

export function buildAccountingSettingsUpdatePayload(form: AccountingSettings) {
	return {
		journal_code_memoriaal: form.journal_code_memoriaal,
		journal_code_bank: form.journal_code_bank,
		account_debiteuren: form.account_debiteuren,
		account_omzet_under_21: form.account_omzet_under_21,
		account_omzet_21_plus: form.account_omzet_21_plus,
		account_btw_21: form.account_btw_21,
		account_bank_stripe: form.account_bank_stripe,
		account_bank_sepa: form.account_bank_sepa,
		btw_code_21: form.btw_code_21,
		btw_code_exempt: form.btw_code_exempt,
		currency: form.currency,
		school_year_start_month: form.school_year_start_month,
		description_template: form.description_template,
		payment_provider: form.payment_provider,
		sepa_creditor_name: form.sepa_creditor_name,
		sepa_creditor_iban: form.sepa_creditor_iban,
		sepa_creditor_bic: form.sepa_creditor_bic,
		sepa_creditor_id: form.sepa_creditor_id,
		sepa_collection_day: form.sepa_collection_day,
		sepa_remittance_template: form.sepa_remittance_template,
		sepa_mandate_prefix: form.sepa_mandate_prefix,
		company_name: form.company_name,
		company_address: form.company_address,
		company_postcode: form.company_postcode,
		company_city: form.company_city,
		company_kvk: form.company_kvk,
		company_btw_nummer: form.company_btw_nummer,
		company_iban: form.company_iban,
		company_email: form.company_email,
		company_phone: form.company_phone,
		company_logo_url: form.company_logo_url,
		invoice_number_prefix: form.invoice_number_prefix,
		invoice_payment_term_days: form.invoice_payment_term_days,
		invoice_footer_text: form.invoice_footer_text,
		cancellation_notice_days: form.cancellation_notice_days,
	};
}

export function clampSepaCollectionDay(value: number): number {
	return Math.min(28, Math.max(1, value || 27));
}

export function clampSchoolYearStartMonth(value: number): number {
	return Math.min(12, Math.max(1, value || 1));
}

export function clampInvoicePaymentTermDays(value: number): number {
	return Math.min(90, Math.max(1, value || 14));
}

/** Notice period for cancelling an agreement: 0–365 days (default 30). */
export function clampCancellationNoticeDays(value: number): number {
	if (!Number.isFinite(value)) return 30;
	return Math.min(365, Math.max(0, Math.round(value)));
}

export function resolveAccountingSettingsSaveSuccessMessage(): string {
	return 'Boekhoud-instellingen opgeslagen';
}

export function resolveAccountingSettingsSaveErrorMessage(message: string): string {
	return `Opslaan mislukt: ${message}`;
}
