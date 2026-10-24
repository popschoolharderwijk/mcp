import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
	AccountingSettingsCompanyCard,
	AccountingSettingsJournalsCard,
	AccountingSettingsLedgerAccountsCard,
	AccountingSettingsSaveButton,
	AccountingSettingsSepaCard,
	AccountingSettingsTaxCard,
} from '@/components/settings/AccountingSettingsFormCards';
import { Card, CardContent } from '@/components/ui/card';
import { useAccountingSettings } from '@/hooks/useAccounting';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { AccountingSettings } from '@/lib/accounting/types';

function buildAccountingSettingsUpdatePayload(form: AccountingSettings) {
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

export function AccountingSettingsManager() {
	const { isAdmin, isSiteAdmin } = useAuth();
	const canEdit = isAdmin || isSiteAdmin;
	const { settings, loading, reload } = useAccountingSettings();
	const [form, setForm] = useState<AccountingSettings | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (settings) setForm(settings as AccountingSettings);
	}, [settings]);

	if (loading || !form) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-muted-foreground">Laden...</CardContent>
			</Card>
		);
	}

	const update = <K extends keyof AccountingSettings>(key: K, value: AccountingSettings[K]) => {
		setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
	};

	const handleSave = async () => {
		if (!form || !canEdit) return;
		setSaving(true);
		const { error } = await supabase
			.from('accounting_settings')
			.update(buildAccountingSettingsUpdatePayload(form))
			.eq('id', true);
		setSaving(false);
		if (error) {
			toast.error(`Opslaan mislukt: ${error.message}`);
			return;
		}
		toast.success('Boekhoud-instellingen opgeslagen');
		reload();
	};

	const fieldProps = { form, canEdit, update };

	return (
		<div className="space-y-6">
			<AccountingSettingsJournalsCard {...fieldProps} />
			<AccountingSettingsLedgerAccountsCard {...fieldProps} />
			<AccountingSettingsSepaCard {...fieldProps} />
			<AccountingSettingsTaxCard {...fieldProps} />
			<AccountingSettingsCompanyCard {...fieldProps} />
			<AccountingSettingsSaveButton canEdit={canEdit} saving={saving} onSave={handleSave} />
		</div>
	);
}
