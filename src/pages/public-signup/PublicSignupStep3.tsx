import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatIban } from '@/lib/direct-debit/iban';
import type { SignupFormFields, SignupSepaFields } from '@/lib/signup/publicSignupHelpers';
import { SignupFormField } from './SignupFormField';

interface PublicSignupStep3Props {
	form: SignupFormFields;
	sepa: SignupSepaFields;
	error: string | null;
	submitting: boolean;
	onFormChange: (form: SignupFormFields) => void;
	onSepaChange: (sepa: SignupSepaFields) => void;
	onPrevious: () => void;
	onSubmit: (event: FormEvent) => void;
}

export function PublicSignupStep3({
	form,
	sepa,
	error,
	submitting,
	onFormChange,
	onSepaChange,
	onPrevious,
	onSubmit,
}: PublicSignupStep3Props) {
	return (
		<form className="space-y-4" onSubmit={onSubmit}>
			<h2 className="text-lg font-semibold">Jouw gegevens</h2>
			{error && (
				<div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded text-sm">
					{error}
				</div>
			)}
			<div className="grid grid-cols-2 gap-3">
				<SignupFormField
					label="Voornaam *"
					value={form.first_name}
					onChange={(first_name) => onFormChange({ ...form, first_name })}
					required
				/>
				<SignupFormField
					label="Achternaam *"
					value={form.last_name}
					onChange={(last_name) => onFormChange({ ...form, last_name })}
					required
				/>
			</div>
			<SignupFormField
				label="E-mail *"
				type="email"
				value={form.email}
				onChange={(email) => onFormChange({ ...form, email })}
				required
			/>
			<SignupFormField
				label="Telefoonnummer"
				value={form.phone_number}
				onChange={(phone_number) => onFormChange({ ...form, phone_number })}
			/>
			<SignupFormField
				label="Geboortedatum"
				type="date"
				value={form.date_of_birth}
				onChange={(date_of_birth) => onFormChange({ ...form, date_of_birth })}
			/>
			<div className="border-t pt-4 space-y-3">
				<p className="text-sm font-medium">Ouder/verzorger (indien minderjarig)</p>
				<SignupFormField
					label="Naam ouder"
					value={form.parent_name}
					onChange={(parent_name) => onFormChange({ ...form, parent_name })}
				/>
				<SignupFormField
					label="E-mail ouder"
					type="email"
					value={form.parent_email}
					onChange={(parent_email) => onFormChange({ ...form, parent_email })}
				/>
				<SignupFormField
					label="Telefoon ouder"
					value={form.parent_phone_number}
					onChange={(parent_phone_number) => onFormChange({ ...form, parent_phone_number })}
				/>
			</div>
			<div className="border-t pt-4 space-y-3">
				<label className="flex items-start gap-2 cursor-pointer">
					<input
						type="checkbox"
						className="mt-1"
						checked={sepa.enabled}
						onChange={(event) => onSepaChange({ ...sepa, enabled: event.target.checked })}
					/>
					<span className="text-sm">
						<span className="font-medium">Betalen via automatische incasso (SEPA)</span>
						<span className="block text-muted-foreground">
							Vul hieronder je bankgegevens in. We rekenen pas af na bevestiging van de aanmelding.
						</span>
					</span>
				</label>
				{sepa.enabled && (
					<div className="space-y-3 pl-6">
						<div>
							<Label>IBAN *</Label>
							<Input
								className="mt-1 font-mono"
								value={sepa.iban}
								onChange={(event) => onSepaChange({ ...sepa, iban: event.target.value })}
								onBlur={() => onSepaChange({ ...sepa, iban: formatIban(sepa.iban) })}
								placeholder="NL00 BANK 0123 4567 89"
								required={sepa.enabled}
							/>
						</div>
						<SignupFormField
							label="Rekeninghouder *"
							value={sepa.holder}
							onChange={(holder) => onSepaChange({ ...sepa, holder })}
							required={sepa.enabled}
						/>
						<SignupFormField
							label="BIC (optioneel)"
							value={sepa.bic}
							onChange={(bic) => onSepaChange({ ...sepa, bic })}
						/>
						<label className="flex items-start gap-2 cursor-pointer">
							<input
								type="checkbox"
								className="mt-1"
								checked={sepa.consent}
								onChange={(event) => onSepaChange({ ...sepa, consent: event.target.checked })}
							/>
							<span className="text-xs text-muted-foreground">
								Door ondertekening van dit machtigingsformulier geef ik toestemming aan POPschool
								Harderwijk om doorlopend incasso-opdrachten naar mijn bank te sturen om een bedrag van
								mijn rekening af te schrijven wegens lesgeld, en aan mijn bank om doorlopend een bedrag
								van mijn rekening af te schrijven overeenkomstig die opdracht.
							</span>
						</label>
					</div>
				)}
			</div>
			<div>
				<Label htmlFor="notes">Opmerkingen</Label>
				<textarea
					id="notes"
					className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm"
					rows={3}
					value={form.notes}
					onChange={(event) => onFormChange({ ...form, notes: event.target.value })}
				/>
			</div>
			<div className="flex justify-between pt-4">
				<Button type="button" variant="outline" onClick={onPrevious}>
					Vorige
				</Button>
				<Button type="submit" disabled={submitting}>
					{submitting ? 'Versturen...' : 'Aanmelden'}
				</Button>
			</div>
		</form>
	);
}
