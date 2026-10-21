import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import type { SignupFormFields } from '@/lib/signup/publicSignupHelpers';
import { SignupFormField } from './SignupFormField';

interface PublicSignupStep3Props {
	form: SignupFormFields;
	paysViaFund: boolean;
	error: string | null;
	submitting: boolean;
	onFormChange: (form: SignupFormFields) => void;
	onFundChange: (paysViaFund: boolean) => void;
	onPrevious: () => void;
	onSubmit: (event: FormEvent) => void;
}

export function PublicSignupStep3({
	form,
	paysViaFund,
	error,
	submitting,
	onFormChange,
	onFundChange,
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
				<p className="text-sm text-muted-foreground">
					Na bevestiging van je les ontvang je een mail om de maandelijkse betaling via iDEAL te regelen.
				</p>
				<label className="flex items-start gap-2 text-sm">
					<input
						type="checkbox"
						checked={paysViaFund}
						onChange={(event) => onFundChange(event.target.checked)}
						className="mt-1 accent-primary"
					/>
					Ik betaal via een fonds (bijv. Jeugdfonds of Stichting Leergeld)
				</label>
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
