import { useEffect, useState } from 'react';
import { LuLoaderCircle } from 'react-icons/lu';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ColorPicker } from '@/components/ui/color-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NAV_LABELS } from '@/config/nav-items';
import { describeSchoolYearBounds } from '@/lib/billing/schoolYear';
import { MONTH_LABELS_NL } from '@/lib/date/month-labels';
import {
	AGENDA_SLOT_MINUTE_OPTIONS,
	agendaEndHourOptionsForStart,
	agendaStartHourOptionsForEnd,
	describeAgendaSetting,
	formatAgendaHourOption,
	isAgendaHourRangeValid,
	withCurrentNumberOption,
} from '@/lib/settings/agendaSettingsHelpers';
import { APP_SETTINGS_BOOTSTRAP } from '@/lib/settings/appSettingsDefaults';
import type {
	AgendaSetting,
	AgreementPaymentMethod,
	AgreementsSetting,
	BrandingSetting,
	SchoolYearSetting,
	TipsSetting,
	TrialLessonsSetting,
	VatSetting,
} from '@/lib/settings/appSettingsTypes';

interface SaveProps<T> {
	canEdit: boolean;
	initial: T;
	saving: boolean;
	onSave: (value: T) => Promise<void>;
}

function settingsValuesEqual<T>(left: T, right: T): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}

type SettingsFormActionsProps = {
	canEdit: boolean;
	saving: boolean;
	saveDisabled?: boolean;
	resetDisabled?: boolean;
	onSave: () => void;
	onReset: () => void;
};

function SettingsFormEditableActions({
	saving,
	saveDisabled = false,
	resetDisabled = false,
	onSave,
	onReset,
}: Omit<SettingsFormActionsProps, 'canEdit'>) {
	return (
		<div className="flex flex-wrap gap-2">
			<Button type="button" variant="outline" onClick={onReset} disabled={saving || resetDisabled}>
				Herstellen
			</Button>
			<Button type="button" onClick={onSave} disabled={saving || saveDisabled}>
				{saving && <LuLoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
				Opslaan
			</Button>
		</div>
	);
}

function SettingsFormActions({ canEdit, ...editable }: SettingsFormActionsProps) {
	if (!canEdit) {
		return <p className="text-sm text-muted-foreground">Alleen een sitebeheerder kan instellingen wijzigen.</p>;
	}
	return <SettingsFormEditableActions {...editable} />;
}

function NumberSelect({
	label,
	value,
	disabled,
	options,
	formatOption,
	onChange,
}: {
	label: string;
	value: number;
	disabled: boolean;
	options: readonly number[];
	formatOption: (value: number) => string;
	onChange: (value: number) => void;
}) {
	return (
		<div className="space-y-2">
			<Label>{label}</Label>
			<Select disabled={disabled} value={String(value)} onValueChange={(next) => onChange(Number(next))}>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option} value={String(option)}>
							{formatOption(option)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

function MonthSelect({
	label,
	value,
	disabled,
	onChange,
}: {
	label: string;
	value: number;
	disabled: boolean;
	onChange: (month: number) => void;
}) {
	return (
		<NumberSelect
			label={label}
			value={value}
			disabled={disabled}
			options={MONTH_LABELS_NL.map((_, index) => index + 1)}
			formatOption={(month) => MONTH_LABELS_NL[month - 1]}
			onChange={onChange}
		/>
	);
}

export function SchoolYearSettingsForm({ canEdit, initial, saving, onSave }: SaveProps<SchoolYearSetting>) {
	const [form, setForm] = useState(initial);
	useEffect(() => setForm(initial), [initial]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Schooljaar</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-4 sm:grid-cols-2">
					<MonthSelect
						label="Startmaand"
						value={form.start_month}
						disabled={!canEdit}
						onChange={(start_month) => setForm((f) => ({ ...f, start_month }))}
					/>
					<MonthSelect
						label="Eindmaand"
						value={form.end_month}
						disabled={!canEdit}
						onChange={(end_month) => setForm((f) => ({ ...f, end_month }))}
					/>
				</div>
				<p className="text-sm text-muted-foreground">{describeSchoolYearBounds(form)}</p>
				<SettingsFormActions
					canEdit={canEdit}
					saving={saving}
					resetDisabled={settingsValuesEqual(form, APP_SETTINGS_BOOTSTRAP.school_year)}
					onReset={() => setForm({ ...APP_SETTINGS_BOOTSTRAP.school_year })}
					onSave={() => void onSave(form)}
				/>
			</CardContent>
		</Card>
	);
}

export function AgendaSettingsForm({ canEdit, initial, saving, onSave }: SaveProps<AgendaSetting>) {
	const [form, setForm] = useState(initial);
	useEffect(() => setForm(initial), [initial]);

	const hourRangeValid = isAgendaHourRangeValid(form.start_hour, form.end_hour);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Agenda</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-4 sm:grid-cols-3">
					<NumberSelect
						label="Startuur"
						value={form.start_hour}
						disabled={!canEdit}
						options={withCurrentNumberOption(agendaStartHourOptionsForEnd(form.end_hour), form.start_hour)}
						formatOption={formatAgendaHourOption}
						onChange={(start_hour) => setForm((f) => ({ ...f, start_hour }))}
					/>
					<NumberSelect
						label="Einduur"
						value={form.end_hour}
						disabled={!canEdit}
						options={withCurrentNumberOption(agendaEndHourOptionsForStart(form.start_hour), form.end_hour)}
						formatOption={formatAgendaHourOption}
						onChange={(end_hour) => setForm((f) => ({ ...f, end_hour }))}
					/>
					<NumberSelect
						label="Blokduur"
						value={form.slot_minutes}
						disabled={!canEdit}
						options={withCurrentNumberOption(AGENDA_SLOT_MINUTE_OPTIONS, form.slot_minutes)}
						formatOption={(minutes) => `${minutes} minuten`}
						onChange={(slot_minutes) => setForm((f) => ({ ...f, slot_minutes }))}
					/>
				</div>
				{hourRangeValid ? (
					<p className="text-sm text-muted-foreground">{describeAgendaSetting(form)}</p>
				) : (
					<p className="text-sm text-destructive">Startuur moet vóór het einduur liggen.</p>
				)}
				<SettingsFormActions
					canEdit={canEdit}
					saving={saving}
					saveDisabled={!hourRangeValid}
					resetDisabled={settingsValuesEqual(form, APP_SETTINGS_BOOTSTRAP.agenda)}
					onReset={() => setForm({ ...APP_SETTINGS_BOOTSTRAP.agenda })}
					onSave={() => void onSave(form)}
				/>
			</CardContent>
		</Card>
	);
}

export function VatSettingsForm({ canEdit, initial, saving, onSave }: SaveProps<VatSetting>) {
	const [form, setForm] = useState(initial);
	useEffect(() => setForm(initial), [initial]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Tarieven</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label>Leeftijdsgrens voor jongeren tarief</Label>
						<Input
							type="number"
							min={1}
							max={100}
							disabled={!canEdit}
							value={form.age_threshold_years}
							onChange={(e) => setForm((f) => ({ ...f, age_threshold_years: Number(e.target.value) }))}
						/>
					</div>
					<div className="space-y-2">
						<Label>Standaard BTW-percentage</Label>
						<Input
							type="number"
							min={0}
							max={100}
							disabled={!canEdit}
							value={form.standard_rate_percent}
							onChange={(e) => setForm((f) => ({ ...f, standard_rate_percent: Number(e.target.value) }))}
						/>
					</div>
				</div>
				<SettingsFormActions
					canEdit={canEdit}
					saving={saving}
					resetDisabled={settingsValuesEqual(form, APP_SETTINGS_BOOTSTRAP.vat)}
					onReset={() => setForm({ ...APP_SETTINGS_BOOTSTRAP.vat })}
					onSave={() => void onSave(form)}
				/>
			</CardContent>
		</Card>
	);
}

export function BrandingSettingsForm({ canEdit, initial, saving, onSave }: SaveProps<BrandingSetting>) {
	const [form, setForm] = useState(initial);
	useEffect(() => setForm(initial), [initial]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Huisstijl</CardTitle>
				<CardDescription>Primaire merkkleur voor UI, PDF en e-mail.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label>Primaire kleur</Label>
					<ColorPicker
						value={form.primary_hex}
						disabled={!canEdit}
						onChange={(hex) => setForm({ primary_hex: hex.toLowerCase() })}
					/>
				</div>
				<SettingsFormActions
					canEdit={canEdit}
					saving={saving}
					resetDisabled={settingsValuesEqual(form, APP_SETTINGS_BOOTSTRAP.branding)}
					onReset={() => setForm({ ...APP_SETTINGS_BOOTSTRAP.branding })}
					onSave={() => void onSave(form)}
				/>
			</CardContent>
		</Card>
	);
}

export function TrialLessonsSettingsForm({ canEdit, initial, saving, onSave }: SaveProps<TrialLessonsSetting>) {
	const [form, setForm] = useState(initial);
	useEffect(() => setForm(initial), [initial]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Proeflessen</CardTitle>
				<CardDescription>Standaard planhorizon en lesduur bij het inplannen van een proefles.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label>Horizon (dagen)</Label>
						<Input
							type="number"
							min={1}
							max={365}
							disabled={!canEdit}
							value={form.horizon_days}
							onChange={(e) => setForm((f) => ({ ...f, horizon_days: Number(e.target.value) }))}
						/>
					</div>
					<div className="space-y-2">
						<Label>Standaard duur (minuten)</Label>
						<Input
							type="number"
							min={5}
							max={240}
							disabled={!canEdit}
							value={form.default_duration_minutes}
							onChange={(e) =>
								setForm((f) => ({ ...f, default_duration_minutes: Number(e.target.value) }))
							}
						/>
					</div>
				</div>
				<SettingsFormActions
					canEdit={canEdit}
					saving={saving}
					resetDisabled={settingsValuesEqual(form, APP_SETTINGS_BOOTSTRAP.trial_lessons)}
					onReset={() => setForm({ ...APP_SETTINGS_BOOTSTRAP.trial_lessons })}
					onSave={() => void onSave(form)}
				/>
			</CardContent>
		</Card>
	);
}

export function AgreementsSettingsForm({ canEdit, initial, saving, onSave }: SaveProps<AgreementsSetting>) {
	const [form, setForm] = useState(initial);
	useEffect(() => setForm(initial), [initial]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Overeenkomsten</CardTitle>
				<CardDescription>
					Standaard startdatum-offset en betaalmethode. De einddatum volgt het ingestelde schooljaareinde.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label>Start over (dagen)</Label>
						<Input
							type="number"
							min={0}
							max={365}
							disabled={!canEdit}
							value={form.default_start_offset_days}
							onChange={(e) =>
								setForm((f) => ({ ...f, default_start_offset_days: Number(e.target.value) }))
							}
						/>
					</div>
					<div className="space-y-2">
						<Label>Betaalmethode</Label>
						<Select
							disabled={!canEdit}
							value={form.default_payment_method}
							onValueChange={(value) =>
								setForm((f) => ({
									...f,
									default_payment_method: value as AgreementPaymentMethod,
								}))
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="sepa">Incasso (SEPA)</SelectItem>
								<SelectItem value="stripe">Stripe</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
				<SettingsFormActions
					canEdit={canEdit}
					saving={saving}
					resetDisabled={settingsValuesEqual(form, APP_SETTINGS_BOOTSTRAP.agreements)}
					onReset={() => setForm({ ...APP_SETTINGS_BOOTSTRAP.agreements })}
					onSave={() => void onSave(form)}
				/>
			</CardContent>
		</Card>
	);
}

export function TipsSettingsForm({ canEdit, initial, saving, onSave }: SaveProps<TipsSetting>) {
	const [form, setForm] = useState(initial);
	useEffect(() => setForm(initial), [initial]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>{NAV_LABELS.tips}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="max-w-xs space-y-2">
					<Label>Minimale wachttijd (minuten)</Label>
					<Input
						type="number"
						min={0}
						max={24 * 60}
						disabled={!canEdit}
						value={form.auto_interval_minutes}
						onChange={(e) => setForm((f) => ({ ...f, auto_interval_minutes: Number(e.target.value) }))}
					/>
				</div>
				<SettingsFormActions
					canEdit={canEdit}
					saving={saving}
					resetDisabled={settingsValuesEqual(form, APP_SETTINGS_BOOTSTRAP.tips)}
					onReset={() => setForm({ ...APP_SETTINGS_BOOTSTRAP.tips })}
					onSave={() => void onSave(form)}
				/>
			</CardContent>
		</Card>
	);
}

export async function persistAppSettingSave(
	save: () => Promise<string | null>,
	successMessage: string,
): Promise<boolean> {
	const error = await save();
	if (error) {
		toast.error(error);
		return false;
	}
	toast.success(successMessage);
	return true;
}
