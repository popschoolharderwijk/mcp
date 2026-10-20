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
import { StripeCatalogCard } from '@/components/settings/StripeCatalogCard';
import { StripeSubscriptionsCheckCard } from '@/components/settings/StripeSubscriptionsCheckCard';
import { Card, CardContent } from '@/components/ui/card';
import { useAccountingSettings } from '@/hooks/useAccounting';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { AccountingSettings } from '@/lib/accounting/types';
import {
	buildAccountingSettingsUpdatePayload,
	resolveAccountingSettingsSaveErrorMessage,
	resolveAccountingSettingsSaveSuccessMessage,
} from '@/lib/settings/accountingSettingsManagerHelpers';

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
			toast.error(resolveAccountingSettingsSaveErrorMessage(error.message));
			return;
		}
		toast.success(resolveAccountingSettingsSaveSuccessMessage());
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
			{canEdit && <StripeCatalogCard />}
			{canEdit && <StripeSubscriptionsCheckCard />}
		</div>
	);
}
