import { LuSave } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AccountingSettings } from '@/lib/accounting/types';
import {
	clampInvoicePaymentTermDays,
	clampSchoolYearStartMonth,
	clampSepaCollectionDay,
} from '@/lib/settings/accountingSettingsManagerHelpers';

type AccountingSettingsFieldProps = {
	form: AccountingSettings;
	canEdit: boolean;
	update: <K extends keyof AccountingSettings>(key: K, value: AccountingSettings[K]) => void;
};

function AccountingSettingsField({
	label,
	fieldKey,
	form,
	canEdit,
	update,
	placeholder,
}: AccountingSettingsFieldProps & {
	label: string;
	fieldKey: keyof AccountingSettings;
	placeholder?: string;
}) {
	return (
		<div className="space-y-1.5">
			<Label htmlFor={`acc-${fieldKey}`}>{label}</Label>
			<Input
				id={`acc-${fieldKey}`}
				value={String(form[fieldKey] ?? '')}
				placeholder={placeholder}
				disabled={!canEdit}
				onChange={(e) => update(fieldKey, e.target.value as AccountingSettings[typeof fieldKey])}
			/>
		</div>
	);
}

export function AccountingSettingsJournalsCard(props: AccountingSettingsFieldProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Dagboeken</CardTitle>
				<CardDescription>Exact Online dagboek-codes</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4 sm:grid-cols-2">
				<AccountingSettingsField
					{...props}
					label="Memoriaal-dagboek"
					fieldKey="journal_code_memorial"
					placeholder="bv. 90"
				/>
				<AccountingSettingsField
					{...props}
					label="Bank-dagboek"
					fieldKey="journal_code_bank"
					placeholder="bv. 20"
				/>
			</CardContent>
		</Card>
	);
}

export function AccountingSettingsLedgerAccountsCard(props: AccountingSettingsFieldProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Grootboekrekeningen</CardTitle>
				<CardDescription>Rekeningnummers zoals ingesteld in Exact</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4 sm:grid-cols-2">
				<AccountingSettingsField
					{...props}
					label="Debiteuren"
					fieldKey="account_debtors"
					placeholder="bv. 1300"
				/>
				<AccountingSettingsField
					{...props}
					label="Bank SEPA-incasso"
					fieldKey="account_bank_sepa"
					placeholder="bv. 1102"
				/>
				<AccountingSettingsField
					{...props}
					label="Omzet <21 (vrijgesteld)"
					fieldKey="account_revenue_under_21"
					placeholder="bv. 8000"
				/>
				<AccountingSettingsField
					{...props}
					label="Omzet 21+ (excl. BTW)"
					fieldKey="account_revenue_21_plus"
					placeholder="bv. 8010"
				/>
				<AccountingSettingsField
					{...props}
					label="BTW af te dragen 21%"
					fieldKey="account_vat_21"
					placeholder="bv. 1500"
				/>
			</CardContent>
		</Card>
	);
}

export function AccountingSettingsSepaCard({ form, canEdit, update }: AccountingSettingsFieldProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>SEPA-incasso</CardTitle>
				<CardDescription>Gegevens van uw incassant; gebruikt voor pain.008 XML-bestanden.</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4 sm:grid-cols-2">
				<AccountingSettingsField
					form={form}
					canEdit={canEdit}
					update={update}
					label="Naam crediteur"
					fieldKey="sepa_creditor_name"
					placeholder="Popschool Harderwijk"
				/>
				<AccountingSettingsField
					form={form}
					canEdit={canEdit}
					update={update}
					label="Crediteur-ID (SEPA)"
					fieldKey="sepa_creditor_id"
					placeholder="NL00ZZZ123456780000"
				/>
				<AccountingSettingsField
					form={form}
					canEdit={canEdit}
					update={update}
					label="IBAN crediteur"
					fieldKey="sepa_creditor_iban"
					placeholder="NL00BANK0123456789"
				/>
				<AccountingSettingsField
					form={form}
					canEdit={canEdit}
					update={update}
					label="BIC crediteur"
					fieldKey="sepa_creditor_bic"
					placeholder="BANKNL2A"
				/>
				<div className="space-y-1.5">
					<Label htmlFor="acc-coll-day">Incassodag van de maand</Label>
					<Input
						id="acc-coll-day"
						type="number"
						min={1}
						max={28}
						disabled={!canEdit}
						value={form.sepa_collection_day}
						onChange={(e) => update('sepa_collection_day', clampSepaCollectionDay(Number(e.target.value)))}
					/>
				</div>
				<AccountingSettingsField
					form={form}
					canEdit={canEdit}
					update={update}
					label="Mandaat-prefix"
					fieldKey="sepa_mandate_prefix"
					placeholder="MND"
				/>
				<AccountingSettingsField
					form={form}
					canEdit={canEdit}
					update={update}
					label="Omschrijving-template"
					fieldKey="sepa_remittance_template"
					placeholder="Lesgeld {periode} - {leerling}"
				/>
			</CardContent>
		</Card>
	);
}

export function AccountingSettingsTaxCard({ form, canEdit, update }: AccountingSettingsFieldProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>BTW-codes & overig</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-4 sm:grid-cols-2">
				<AccountingSettingsField
					form={form}
					canEdit={canEdit}
					update={update}
					label="BTW-code 21%"
					fieldKey="vat_code_21"
					placeholder="bv. VH"
				/>
				<AccountingSettingsField
					form={form}
					canEdit={canEdit}
					update={update}
					label="BTW-code vrijgesteld"
					fieldKey="vat_code_exempt"
					placeholder="bv. 0"
				/>
				<AccountingSettingsField
					form={form}
					canEdit={canEdit}
					update={update}
					label="Valuta"
					fieldKey="currency"
					placeholder="EUR"
				/>
				<div className="space-y-1.5">
					<Label htmlFor="acc-month">Boekjaar startmaand</Label>
					<Input
						id="acc-month"
						type="number"
						min={1}
						max={12}
						disabled={!canEdit}
						value={form.school_year_start_month}
						onChange={(e) =>
							update('school_year_start_month', clampSchoolYearStartMonth(Number(e.target.value)))
						}
					/>
				</div>
			</CardContent>
		</Card>
	);
}

export function AccountingSettingsCompanyCard({ form, canEdit, update }: AccountingSettingsFieldProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Bedrijfsgegevens & factuur</CardTitle>
				<CardDescription>Verschijnen op alle facturen (PDF + e-mail).</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4 sm:grid-cols-2">
				<AccountingSettingsField
					form={form}
					canEdit={canEdit}
					update={update}
					label="Bedrijfsnaam"
					fieldKey="company_name"
					placeholder="popschool harderwijk"
				/>
				<AccountingSettingsField
					form={form}
					canEdit={canEdit}
					update={update}
					label="E-mailadres"
					fieldKey="company_email"
					placeholder="info@popschoolharderwijk.nl"
				/>
				<AccountingSettingsField
					form={form}
					canEdit={canEdit}
					update={update}
					label="Telefoon"
					fieldKey="company_phone"
					placeholder="0341 - 123456"
				/>
				<AccountingSettingsField
					form={form}
					canEdit={canEdit}
					update={update}
					label="Adres"
					fieldKey="company_address"
					placeholder="Hoofdstraat 1"
				/>
				<AccountingSettingsField
					form={form}
					canEdit={canEdit}
					update={update}
					label="Postcode"
					fieldKey="company_postcode"
					placeholder="3841 AB"
				/>
				<AccountingSettingsField
					form={form}
					canEdit={canEdit}
					update={update}
					label="Plaats"
					fieldKey="company_city"
					placeholder="Harderwijk"
				/>
				<AccountingSettingsField
					form={form}
					canEdit={canEdit}
					update={update}
					label="KvK-nummer"
					fieldKey="company_kvk_number"
					placeholder="12345678"
				/>
				<AccountingSettingsField
					form={form}
					canEdit={canEdit}
					update={update}
					label="BTW-nummer"
					fieldKey="company_vat_number"
					placeholder="NL123456789B01"
				/>
				<AccountingSettingsField
					form={form}
					canEdit={canEdit}
					update={update}
					label="IBAN"
					fieldKey="company_iban"
					placeholder="NL00BANK0123456789"
				/>
				<AccountingSettingsField
					form={form}
					canEdit={canEdit}
					update={update}
					label="Logo-URL (optioneel)"
					fieldKey="company_logo_url"
				/>
				<AccountingSettingsField
					form={form}
					canEdit={canEdit}
					update={update}
					label="Factuurnummer-prefix"
					fieldKey="invoice_number_prefix"
					placeholder="INV-"
				/>
				<div className="space-y-1.5">
					<Label htmlFor="acc-pay-term">Betaaltermijn (dagen)</Label>
					<Input
						id="acc-pay-term"
						type="number"
						min={1}
						max={90}
						disabled={!canEdit}
						value={form.invoice_payment_term_days}
						onChange={(e) =>
							update('invoice_payment_term_days', clampInvoicePaymentTermDays(Number(e.target.value)))
						}
					/>
				</div>
				<div className="space-y-1.5 sm:col-span-2">
					<Label htmlFor="acc-footer">Footer-tekst (optioneel)</Label>
					<Input
						id="acc-footer"
						value={form.invoice_footer_text ?? ''}
						disabled={!canEdit}
						onChange={(e) => update('invoice_footer_text', e.target.value)}
						placeholder="bv. Bedankt voor je aanmelding bij popschool harderwijk!"
					/>
				</div>
			</CardContent>
		</Card>
	);
}

export function AccountingSettingsSaveButton({
	canEdit,
	saving,
	onSave,
}: {
	canEdit: boolean;
	saving: boolean;
	onSave: () => void;
}) {
	if (!canEdit) return null;

	return (
		<div className="flex justify-end">
			<Button onClick={onSave} disabled={saving}>
				<LuSave className="h-4 w-4 mr-2" />
				{saving ? 'Opslaan...' : 'Opslaan'}
			</Button>
		</div>
	);
}
