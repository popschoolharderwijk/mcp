import type { AccountingSettings } from '@/lib/accounting/types';

export function buildAccountingSettingsUpdatePayload(form: AccountingSettings) {
	return {
		journal_code_memorial: form.journal_code_memorial,
		journal_code_bank: form.journal_code_bank,
		account_debtors: form.account_debtors,
		account_revenue_youth: form.account_revenue_youth,
		account_revenue_adult: form.account_revenue_adult,
		account_vat_21: form.account_vat_21,
		account_bank_stripe: form.account_bank_stripe,
		account_bank_sepa: form.account_bank_sepa,
		vat_code_21: form.vat_code_21,
		vat_code_exempt: form.vat_code_exempt,
		currency: form.currency,
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
		company_kvk_number: form.company_kvk_number,
		company_vat_number: form.company_vat_number,
		company_iban: form.company_iban,
		company_email: form.company_email,
		company_phone: form.company_phone,
		company_logo_url: form.company_logo_url,
		invoice_number_prefix: form.invoice_number_prefix,
		invoice_payment_term_days: form.invoice_payment_term_days,
		invoice_footer_text: form.invoice_footer_text,
	};
}

export function clampSepaCollectionDay(value: number): number {
	return Math.min(28, Math.max(1, value || 27));
}

export function clampInvoicePaymentTermDays(value: number): number {
	return Math.min(90, Math.max(1, value || 14));
}

export function resolveAccountingSettingsSaveSuccessMessage(): string {
	return 'Boekhoud-instellingen opgeslagen';
}

export function resolveAccountingSettingsSaveErrorMessage(message: string): string {
	return `Opslaan mislukt: ${message}`;
}
