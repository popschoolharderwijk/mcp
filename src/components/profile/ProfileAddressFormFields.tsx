import { CountrySelect } from '@/components/ui/country-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProfileAddressFormState } from '@/types/profile-address';

interface ProfileAddressFormFieldsProps {
	form: ProfileAddressFormState;
	onChange: (next: ProfileAddressFormState) => void;
	disabled?: boolean;
	idPrefix?: string;
}

export function ProfileAddressFormFields({
	form,
	onChange,
	disabled = false,
	idPrefix = 'address',
}: ProfileAddressFormFieldsProps) {
	const set =
		(key: keyof ProfileAddressFormState) =>
		(value: string): void => {
			onChange({ ...form, [key]: value });
		};

	return (
		<div className="space-y-3">
			<div className="flex gap-3">
				<div className="min-w-0 flex-1 space-y-1.5">
					<Label htmlFor={`${idPrefix}-street-name`}>Straatnaam</Label>
					<Input
						id={`${idPrefix}-street-name`}
						value={form.street_name}
						onChange={(e) => set('street_name')(e.target.value)}
						disabled={disabled}
						placeholder="Hoofdstraat"
					/>
				</div>
				<div className="w-24 shrink-0 space-y-1.5">
					<Label htmlFor={`${idPrefix}-house-number`}>Nr.</Label>
					<Input
						id={`${idPrefix}-house-number`}
						value={form.house_number}
						onChange={(e) => set('house_number')(e.target.value)}
						disabled={disabled}
						placeholder="12A"
					/>
				</div>
			</div>
			<div className="flex gap-3">
				<div className="w-28 shrink-0 space-y-1.5">
					<Label htmlFor={`${idPrefix}-postal-code`}>Postcode</Label>
					<Input
						id={`${idPrefix}-postal-code`}
						value={form.postal_code}
						onChange={(e) => set('postal_code')(e.target.value)}
						disabled={disabled}
						placeholder="1234AB"
					/>
				</div>
				<div className="min-w-0 flex-1 space-y-1.5">
					<Label htmlFor={`${idPrefix}-city`}>Woonplaats</Label>
					<Input
						id={`${idPrefix}-city`}
						value={form.city}
						onChange={(e) => set('city')(e.target.value)}
						disabled={disabled}
						placeholder="Amsterdam"
					/>
				</div>
			</div>
			<div className="space-y-1.5">
				<Label htmlFor={`${idPrefix}-country-code`}>Land</Label>
				<CountrySelect
					id={`${idPrefix}-country-code`}
					value={form.country_code}
					onChange={set('country_code')}
					disabled={disabled}
				/>
			</div>
		</div>
	);
}
