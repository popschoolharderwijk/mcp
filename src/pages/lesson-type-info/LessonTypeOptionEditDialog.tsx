import type { Dispatch, SetStateAction } from 'react';
import { LuLoaderCircle } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PriceInput } from '@/components/ui/price-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateNl } from '@/lib/billing/lessonFeeFormat';
import { frequencyOptions } from '@/lib/frequencies';
import { DURATION_OPTIONS } from '@/pages/lesson-type-info/constants';
import { updateOptionModalField } from '@/pages/lesson-type-info/optionModalFormHelpers';
import type { OptionModalFormState, OptionRowWithKey } from '@/pages/lesson-type-info/types';
import { centsToInput, formatOptionPrice } from '@/pages/lesson-type-info/utils';
import type { LessonBillingKind, LessonFrequency } from '@/types/lesson-agreements';

interface LessonTypeOptionEditDialogProps {
	editingOption: OptionRowWithKey;
	onClose: () => void;
	optionModalForm: OptionModalFormState;
	setOptionModalForm: Dispatch<SetStateAction<OptionModalFormState>>;
	onSave: () => void;
	saving: boolean;
}

function TariffHistory({ option }: { option: OptionRowWithKey }) {
	if (option.tariffs.length === 0) return null;
	return (
		<div className="space-y-1 rounded-md border bg-muted/30 p-3 text-sm">
			<p className="font-medium">Tariefhistorie</p>
			<ul className="space-y-0.5 text-muted-foreground">
				{option.tariffs.map((t) => (
					<li key={t.id}>
						Per {formatDateNl(t.effective_from)}: {'< 21 '}
						{formatOptionPrice(centsToInput(t.amount_under_21_cents))} · 21+{' '}
						{formatOptionPrice(centsToInput(t.amount_adult_cents))}
					</li>
				))}
			</ul>
		</div>
	);
}

export function LessonTypeOptionEditDialog({
	editingOption,
	onClose,
	optionModalForm,
	setOptionModalForm,
	onSave,
	saving,
}: LessonTypeOptionEditDialogProps) {
	const set = <K extends keyof OptionModalFormState>(key: K, value: OptionModalFormState[K]) =>
		setOptionModalForm((prev) => updateOptionModalField(prev, key, value));
	const isOneOff = optionModalForm.billing_kind === 'one_off';

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{editingOption.id ? 'Lesvorm bewerken' : 'Lesvorm toevoegen'}</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Duur (min)</Label>
							<Select value={optionModalForm.duration_minutes} onValueChange={(v) => set('duration_minutes', v)}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{DURATION_OPTIONS.map((duration) => (
										<SelectItem key={duration} value={String(duration)}>
											{duration}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Frequentie</Label>
							<Select
								value={optionModalForm.frequency}
								onValueChange={(v) => set('frequency', v as LessonFrequency)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{frequencyOptions.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor="option-label">Naam (optioneel)</Label>
						<Input
							id="option-label"
							value={optionModalForm.label}
							onChange={(e) => set('label', e.target.value)}
							placeholder="Bijv. Popkoor (18+)"
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Afrekening</Label>
							<Select
								value={optionModalForm.billing_kind}
								onValueChange={(v) => set('billing_kind', v as LessonBillingKind)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="monthly">Vast maandbedrag (11× per jaar)</SelectItem>
									<SelectItem value="one_off">Eenmalig (cursus)</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>21+-tarief</Label>
							<Select
								value={optionModalForm.has_adult_tariff ? 'yes' : 'no'}
								onValueChange={(v) => set('has_adult_tariff', v === 'yes')}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="yes">Ja</SelectItem>
									<SelectItem value="no">Nee, alleen onder 21</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="space-y-2">
						<Label>Tarief geldig vanaf</Label>
						<DatePicker value={optionModalForm.effective_from || null} onChange={(v) => set('effective_from', v ?? '')} />
						<p className="text-xs text-muted-foreground">
							Kies een nieuwe datum om een tariefwijziging vast te leggen. Lopende overeenkomsten gaan vanaf die
							datum automatisch over.
						</p>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>{isOneOff ? 'Bedrag < 21 (€)' : 'Maandbedrag < 21 (€)'}</Label>
							<PriceInput
								value={optionModalForm.amount_under_21}
								onChange={(e) => set('amount_under_21', e.target.value)}
								className="h-10"
							/>
						</div>
						<div className="space-y-2">
							<Label>{isOneOff ? 'Bedrag 21+ incl. btw (€)' : 'Maandbedrag 21+ incl. btw (€)'}</Label>
							<PriceInput
								value={optionModalForm.amount_adult}
								onChange={(e) => set('amount_adult', e.target.value)}
								className="h-10"
								disabled={!optionModalForm.has_adult_tariff}
							/>
						</div>
					</div>
					<TariffHistory option={editingOption} />
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Annuleren
					</Button>
					<Button onClick={onSave} disabled={saving}>
						{saving ? (
							<>
								<LuLoaderCircle className="mr-2 h-4 w-4 animate-spin" />
								Opslaan...
							</>
						) : (
							'Opslaan'
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
